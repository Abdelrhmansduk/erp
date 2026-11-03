import React, { useState, useMemo, useEffect } from 'react';
import { Badge } from '../ui/Badge';
import { 
  Building2, Plus, FileSpreadsheet, FileText, Search, Printer, 
  Trash2, Edit3, CheckCircle2, AlertCircle, TrendingUp, DollarSign,
  Download, Eye, Calculator, ArrowRightLeft, Sparkles, Layers, 
  ShieldCheck, X, RefreshCw, Landmark, Tag, Check, Award, BarChart3,
  Users, Star, MapPin, Phone, Mail, PieChart, Activity, Copy,
  Upload, FileUp, QrCode, Percent, ArrowUpRight, Shield, CheckSquare,
  Filter, ChevronRight, ChevronLeft, Calendar, FileCheck, HelpCircle,
  Clock, Hash, ExternalLink, FolderSync, LayoutGrid, Table as TableIcon
} from 'lucide-react';
import { KasTenderItem, SheetCategory, KasSheetMeta } from '../../types/kasMonafasat';
import { kasMonafasatService, KAS_SHEETS_META } from '../../services/kasMonafasatService';
import { generateZatcaQR } from '../../services/zatcaPhase2Service';
import { useAppStore } from '../../stores/appStore';
import { tafqeet } from '../../services/tafqeetService';
import { KasKpiCard, KasTenderCard } from '../kas/KasCards';

interface Props {
  onConvertToBOQ?: (tender: KasTenderItem) => void;
}

export const KasMonafasatSpreadsheetView: React.FC<Props> = ({ onConvertToBOQ }) => {
  const { addNotification } = useAppStore();

  // Navigation & Sheet selection
  const [activeCategory, setActiveCategory] = useState<SheetCategory>('companies');
  const [selectedSheetName, setSelectedSheetName] = useState<string>('تجارة');
  
  // View mode: Table vs Cards
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Data state
  const [tenders, setTenders] = useState<KasTenderItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Modals state
  const [selectedItem, setSelectedItem] = useState<KasTenderItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState<Partial<KasTenderItem>>({});

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    seq: true,
    company: true,
    tenderCode: true,
    title: true,
    referenceNumber: true,
    entity: true,
    manager: true,
    deadlineDate: true,
    duration: true,
    bidValue: true,
    winningBidValue: true,
    notes: true,
    rejectionReason: true,
    boqStatus: true,
    city: true,
    platform: false,
    actions: true,
  });

  const [showColSettings, setShowColSettings] = useState<boolean>(false);

  // Load tenders on sheet/category change
  const loadData = () => {
    setLoading(true);
    try {
      let data: KasTenderItem[] = [];
      if (activeCategory === 'all') {
        data = kasMonafasatService.getAllTenders();
      } else {
        data = kasMonafasatService.getSheetTenders(selectedSheetName);
      }
      setTenders(data);
      setCurrentPage(1);
    } catch (e) {
      console.error('Error loading tenders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeCategory, selectedSheetName]);

  // Sheets for currently active category
  const categorySheets = useMemo(() => {
    return KAS_SHEETS_META.filter(s => s.category === activeCategory);
  }, [activeCategory]);

  // Automatically select first sheet when category changes
  const handleCategoryChange = (cat: SheetCategory) => {
    setActiveCategory(cat);
    if (cat === 'all') {
      setSelectedSheetName('الكل');
    } else {
      const sheets = KAS_SHEETS_META.filter(s => s.category === cat);
      if (sheets.length > 0) {
        setSelectedSheetName(sheets[0].name);
      }
    }
  };

  // Filter options lists
  const filterOptions = useMemo(() => {
    const statuses = new Set<string>();
    const reasons = new Set<string>();
    const cities = new Set<string>();

    tenders.forEach(t => {
      if (t.notes) statuses.add(t.notes.trim());
      if (t.rejectionReason) reasons.add(t.rejectionReason.trim());
      if (t.city) cities.add(t.city.trim());
    });

    return {
      statuses: Array.from(statuses).filter(Boolean),
      reasons: Array.from(reasons).filter(Boolean),
      cities: Array.from(cities).filter(Boolean),
    };
  }, [tenders]);

  // Filtered tenders
  const filteredTenders = useMemo(() => {
    return tenders.filter(item => {
      // Universal search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesRef = item.referenceNumber?.toLowerCase().includes(q) || item.tenderNumber?.toLowerCase().includes(q);
        const matchesCode = item.tenderCode?.toLowerCase().includes(q);
        const matchesEntity = item.entity?.toLowerCase().includes(q);
        const matchesManager = item.managerName?.toLowerCase().includes(q);
        const matchesCompany = item.company?.toLowerCase().includes(q);
        const matchesCity = item.city?.toLowerCase().includes(q);

        if (!matchesTitle && !matchesRef && !matchesCode && !matchesEntity && !matchesManager && !matchesCompany && !matchesCity) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && item.notes !== statusFilter) {
        return false;
      }

      // Reason filter
      if (reasonFilter !== 'all' && item.rejectionReason !== reasonFilter) {
        return false;
      }

      // City filter
      if (cityFilter !== 'all' && item.city !== cityFilter) {
        return false;
      }

      return true;
    });
  }, [tenders, searchQuery, statusFilter, reasonFilter, cityFilter]);

  // Paginated records
  const totalPages = Math.ceil(filteredTenders.length / pageSize) || 1;
  const paginatedTenders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTenders.slice(start, start + pageSize);
  }, [filteredTenders, currentPage, pageSize]);

  // Statistical KPIs
  const kpis = useMemo(() => {
    let totalBidValue = 0;
    let totalWinningValue = 0;
    let wonCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;
    let highBidCount = 0;

    filteredTenders.forEach(t => {
      const bid = Number(t.bidValue) || 0;
      const win = Number(t.winningBidValue) || 0;
      totalBidValue += bid;
      totalWinningValue += win;

      const note = (t.notes || '').toLowerCase();
      const reason = (t.rejectionReason || '').toLowerCase();

      if (note.includes('تم الترسية') || note.includes('معتمد') || reason.includes('تم الترسية')) {
        wonCount++;
      } else if (note.includes('فحص') || note.includes('انتظار') || !note) {
        pendingCount++;
      } else if (reason.includes('مرتفع') || note.includes('مرتفع')) {
        highBidCount++;
      } else {
        rejectedCount++;
      }
    });

    const evaluatedCount = wonCount + rejectedCount + highBidCount;
    const winRate = evaluatedCount > 0 ? ((wonCount / evaluatedCount) * 100).toFixed(1) : '0';

    return {
      totalTenders: filteredTenders.length,
      totalBidValue,
      totalWinningValue,
      wonCount,
      pendingCount,
      rejectedCount,
      highBidCount,
      winRate,
    };
  }, [filteredTenders]);

  // Actions handlers
  const handleOpenAdd = () => {
    setFormData({
      company: 'مؤسسة خالد السليم للتجارة',
      tenderCode: '',
      title: '',
      referenceNumber: '',
      entity: '',
      managerName: '',
      managerPhone: '',
      bidValue: 0,
      winningBidValue: 0,
      deadlineDate: '',
      notes: 'مرحلة فحص العروض',
      rejectionReason: 'معلقة',
      city: '',
      sheetName: selectedSheetName,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (item: KasTenderItem) => {
    setSelectedItem(item);
    setFormData({ ...item });
    setIsEditModalOpen(true);
  };

  const handleSaveAdd = () => {
    if (!formData.title) {
      addNotification({
        title: 'تنبيه إدخال',
        message: 'يرجى كتابة اسم المنافسة.',
        type: 'warning',
      });
      return;
    }
    const targetSheet = formData.sheetName || selectedSheetName || 'تجارة';
    const newItem = kasMonafasatService.addTender(targetSheet, formData as any);
    addNotification({
      title: 'تمت الإضافة بنجاح',
      message: `تمت إضافة منافسة "${newItem.title}" إلى السجل.`,
      type: 'success',
    });
    setIsAddModalOpen(false);
    loadData();
  };

  const handleSaveEdit = () => {
    if (!selectedItem || !selectedItem.id) return;
    const targetSheet = selectedItem.sheetName || selectedSheetName || 'تجارة';
    const success = kasMonafasatService.updateTender(targetSheet, selectedItem.id, formData);
    if (success) {
      addNotification({
        title: 'تم التحديث بنجاح',
        message: `تم تحديث بيانات المنافسة بنجاح.`,
        type: 'success',
      });
      setIsEditModalOpen(false);
      loadData();
    }
  };

  const handleDelete = (item: KasTenderItem) => {
    if (confirm(`هل أنت متأكد من حذف المنافسة: "${item.title}"؟`)) {
      const targetSheet = item.sheetName || selectedSheetName || 'تجارة';
      kasMonafasatService.deleteTender(targetSheet, item.id);
      addNotification({
        title: 'تم الحذف',
        message: 'تم حذف المنافسة بنجاح من السجل المحلي.',
        type: 'info',
      });
      loadData();
    }
  };

  const handleExport = () => {
    kasMonafasatService.exportSheetToXLSX(selectedSheetName, filteredTenders);
    addNotification({
      title: 'تم التصدير',
      message: `تم تجهيز وتحميل ملف Excel يحتوي على ${filteredTenders.length} سجل.`,
      type: 'success',
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const res = await kasMonafasatService.importFromXLSX(file);
    if (res.success) {
      addNotification({
        title: 'نجاح الاستيراد',
        message: `تم استيراد ${res.importedCount} سجل منافسة بنجاح من ملف Excel.`,
        type: 'success',
      });
      setIsImportModalOpen(false);
      loadData();
    } else {
      addNotification({
        title: 'تعذر استيراد الملف',
        message: res.message || 'حدث خطأ أثناء قراءة ملف الإكسيل.',
        type: 'error',
      });
    }
  };

  // Helper badge color
  const getStatusBadge = (notes?: string, reason?: string) => {
    const combined = `${notes || ''} ${reason || ''}`.trim();
    const txt = combined.toLowerCase();

    let label = 'قيد الدراسة والتحليل';
    let type: 'success' | 'warning' | 'danger' | 'info' = 'info';

    if (txt.includes('تم الترسية') || txt.includes('معتمد') || txt.includes('تم اعتماد') || txt.includes('ترسية') || txt.includes('فائز')) {
      label = 'تمت الترسية والاعتماد';
      type = 'success';
    } else if (txt.includes('مرتفع') || txt.includes('فارق مالي')) {
      label = 'عرض مالي مرتفع';
      type = 'warning';
    } else if (txt.includes('إلغاء') || txt.includes('الغاء') || txt.includes('لاغي')) {
      label = 'منافسة ملغية';
      type = 'danger';
    } else if (txt.includes('غير مطابق') || txt.includes('استبعاد') || txt.includes('مستبعد')) {
      label = 'غير مطابق للشروط';
      type = 'danger';
    } else if (txt.includes('فحص') || txt.includes('تحت الدراسة')) {
      label = 'مرحلة فحص العروض';
      type = 'info';
    } else if (notes && notes.length <= 25) {
      label = notes;
    }

    const colorMap = {
      success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      danger: 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      info: 'bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black border shadow-2xs ${colorMap[type]}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
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
          <div className="flex items-center gap-3">
            <div style={{ width: '44px', height: '44px', borderRadius: '9999px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                  KAS LIVE MONAFASAT MASTER
                </span>
                <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>
                  Google Sheet Synchronizer (11,700+ منافسة)
                </span>
              </div>
              <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
                سجل ومنظومة منافسات شركة كاس والمجموعة
              </h1>
              <p className="text-xs text-zinc-400 mt-1 font-sans">
                إدارة ومتابعة أكثر من 11,700 منافسة حكومية وترسية تعاقدية لكافة مؤسسات وشركات المجموعة عبر منصة اعتماد والجهات الرسمية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleOpenAdd}
              className="button-white-pill"
              style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px', backgroundColor: '#ffffff', color: '#000000', fontWeight: '700' }}
            >
              <Plus className="w-4 h-4 ml-1 text-emerald-700" />
              <span>+ إضافة منافسة</span>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="button-outline-on-dark"
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
            >
              <Upload className="w-3.5 h-3.5 ml-1 text-emerald-400" />
              <span>استيراد إكسل</span>
            </button>

            <button
              onClick={handleExport}
              className="button-outline-on-dark"
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
            >
              <Download className="w-3.5 h-3.5 ml-1 text-sky-400" />
              <span>تصدير XLSX</span>
            </button>

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="button-outline-on-dark"
              style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
              title="طباعة كشف المنافسات"
            >
              <Printer className="w-3.5 h-3.5 ml-1 text-amber-300" />
              <span>طباعة كشف</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Signature KPI Cards Row matching exact design screenshot */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {/* Card 1: White Card */}
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>إجمالي المنافسات المسجلة</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {kpis.totalTenders.toLocaleString()} سجل
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>سجل تدقيق مستمر</span>
        </div>

        {/* Card 2: Pistachio Band Card */}
        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
          <span style={{ fontSize: '13px', color: '#000000', fontWeight: 550 }}>الترسيات والاعتمادات المنجزة</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {kpis.wonCount} ترسية
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>معدل الفوز {kpis.winRate}%</span>
        </div>

        {/* Card 3: Pitch Black Featured Card */}
        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#000000', color: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 550 }}>إجمالي قيمة العروض المقدمة</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {kpis.totalBidValue > 1000000 ? `${(kpis.totalBidValue / 1000000).toFixed(2)}M` : `${(kpis.totalBidValue / 1000).toFixed(0)}k`} ⃁
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>قيمة الترسيات: {kpis.totalWinningValue > 1000000 ? `${(kpis.totalWinningValue / 1000000).toFixed(2)}M` : `${(kpis.totalWinningValue / 1000).toFixed(0)}k`} ⃁</span>
        </div>

        {/* Card 4: White Card */}
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>نسبة الترسية والجاهزية</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {kpis.winRate}%
          </div>
          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(15, Number(kpis.winRate) || 0))}%` }} />
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>{kpis.pendingCount} عروض قيد الفحص</span>
        </div>
      </div>

      {/* Primary Category Selector - Capsule Pill Container */}
      <div className="card-pricing" style={{ padding: '14px 18px', borderRadius: '16px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
          <span className="text-xs font-semibold text-zinc-500 ml-1">التصنيف:</span>
          {[
            { id: 'companies', label: 'المؤسسات والأنشطة (6)', icon: Building2 },
            { id: 'medical', label: 'الإدارة الطبية (12 شهراً)', icon: Activity },
            { id: 'monthly', label: 'المتابعة الشهرية (12 شهراً)', icon: Calendar },
            { id: 'archive', label: 'أرشيف المنافسات (2024 & عامة)', icon: Layers },
            { id: 'all', label: 'اللوحة الإجمالية (11,700+ سجل)', icon: Sparkles },
          ].map(cat => {
            const isActive = activeCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id as any)}
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
                  gap: '6px',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-zinc-500 flex items-center gap-2 font-mono px-3 py-1 bg-zinc-50 rounded-full border border-zinc-200 shrink-0">
          <span className="font-bold">السجلات:</span>
          <span className="font-black text-black font-mono">{filteredTenders.length.toLocaleString()}</span>
        </div>
      </div>

      {/* Sub-sheets Pills (if category is not 'all') */}
      {activeCategory !== 'all' && (
        <div className="card-pricing" style={{ padding: '12px 18px', borderRadius: '16px', background: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
          <span className="text-xs font-semibold text-zinc-500 whitespace-nowrap px-1 flex items-center gap-1.5">
            <FolderSync className="w-3.5 h-3.5 text-emerald-600" />
            <span>اختر الشيت:</span>
          </span>
          {categorySheets.map((s: KasSheetMeta) => {
            const isSelected = selectedSheetName === s.name;
            const count = kasMonafasatService.getSheetTenders(s.name).length;
            return (
              <button
                key={s.name}
                onClick={() => setSelectedSheetName(s.name)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '11.5px',
                  fontWeight: isSelected ? 550 : 420,
                  border: '1px solid',
                  borderColor: isSelected ? '#000000' : '#e4e4e7',
                  backgroundColor: isSelected ? '#000000' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#27272a',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{s.label}</span>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#f4f4f5',
                    color: isSelected ? '#ffffff' : '#52525b',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Filter, Search & View Switcher Toolbar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Universal Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث برقم المنافسة، الرقم المرجعي، اسم المنافسة، الجهة الحكومية، المسؤول، المدينة..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Dropdown Filters & View Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">كل الحالات (الملاحظات)</option>
              {filterOptions.statuses.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>

            <select
              value={reasonFilter}
              onChange={e => setReasonFilter(e.target.value)}
              className="px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">كل أسباب الترسية/الاستبعاد</option>
              {filterOptions.reasons.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            {filterOptions.cities.length > 0 && (
              <select
                value={cityFilter}
                onChange={e => setCityFilter(e.target.value)}
                className="px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">كل المدن</option>
                {filterOptions.cities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

            {(statusFilter !== 'all' || reasonFilter !== 'all' || cityFilter !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setReasonFilter('all');
                  setCityFilter('all');
                  setSearchQuery('');
                }}
                className="px-3.5 py-2 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-all cursor-pointer"
              >
                مسح الفلاتر
              </button>
            )}

            {/* View Mode Toggle Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="عرض الجدول"
              >
                <TableIcon className="w-4 h-4" />
                <span className="hidden sm:inline">جدول</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="عرض البطاقات"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">كروت</span>
              </button>
            </div>

            <button
              onClick={() => setShowColSettings(!showColSettings)}
              className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs flex items-center gap-1 border border-slate-200 dark:border-slate-700 cursor-pointer"
              title="تخصيص الأعمدة"
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Column Settings Toggle Dropdown */}
        {showColSettings && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-3 text-xs">
            <span className="font-black text-slate-700 dark:text-slate-300 w-full mb-1">إظهار / إخفاء الأعمدة:</span>
            {Object.keys(visibleColumns).map(colKey => (
              <label key={colKey} className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={visibleColumns[colKey]}
                  onChange={e => setVisibleColumns(prev => ({ ...prev, [colKey]: e.target.checked }))}
                  className="rounded-lg text-emerald-600 focus:ring-emerald-500"
                />
                <span>{colKey}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Main Content: Cards View vs Table View */}
      {viewMode === 'cards' ? (
        <div>
          {paginatedTenders.length === 0 ? (
            <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-slate-400">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-base text-slate-800 dark:text-slate-200">لا توجد منافسات مطابقة للبحث أو الفلتر المحدد</p>
              <p className="text-xs mt-1 text-slate-500">جرّب تغيير كلمات البحث أو اختيار شيت آخر</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedTenders.map(item => (
                <KasTenderCard
                  key={item.id}
                  tender={{
                    id: item.id,
                    referenceNumber: item.referenceNumber || item.tenderCode || '-',
                    title: item.title,
                    clientName: item.entity || 'الجهة الحكومية',
                    entityName: item.entity,
                    category: item.company || 'كاس للتجارة',
                    status: item.notes || item.rejectionReason || 'قيد الفحص',
                    grandTotal: Number(item.bidValue) || 0,
                    itemsCount: typeof item.durationDays === 'number' ? item.durationDays : parseInt(String(item.durationDays || '1')) || 1,
                    submissionDate: item.deadlineDate,
                    supplyDuration: item.executionDuration,
                  }}
                  onOpenBOQ={() => {
                    if (onConvertToBOQ) {
                      onConvertToBOQ(item);
                    } else {
                      setSelectedItem(item);
                      setIsDetailModalOpen(true);
                    }
                  }}
                  onEdit={() => handleOpenEdit(item)}
                  onDelete={() => handleDelete(item)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[680px]">
            <table className="min-w-[1720px] w-full text-xs text-right border-collapse select-text table-fixed">
              <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700 shadow-xs">
                <tr className="divide-x divide-x-reverse divide-slate-200 dark:divide-slate-700">
                  {visibleColumns.seq && <th className="p-3.5 w-14 text-center font-mono">#</th>}
                  {visibleColumns.company && <th className="p-3.5 w-44">المؤسسة</th>}
                  {visibleColumns.tenderCode && <th className="p-3.5 w-28 font-mono">كود المنافسة</th>}
                  {visibleColumns.title && <th className="p-3.5 w-80">اسم المنافسة والمشروع</th>}
                  {visibleColumns.referenceNumber && <th className="p-3.5 w-36 font-mono">الرقم المرجعي / اعتماد</th>}
                  {visibleColumns.entity && <th className="p-3.5 w-48">الجهة الحكومية</th>}
                  {visibleColumns.manager && <th className="p-3.5 w-36">المسؤول / التواصل</th>}
                  {visibleColumns.deadlineDate && <th className="p-3.5 w-28 font-mono">انتهاء التقديم</th>}
                  {visibleColumns.duration && <th className="p-3.5 w-24">مدة التنفيذ</th>}
                  {visibleColumns.bidValue && <th className="p-3.5 w-32 text-left font-mono">قيمة العرض (⃁)</th>}
                  {visibleColumns.winningBidValue && <th className="p-3.5 w-36 text-left font-mono">المبلغ الفائز (⃁)</th>}
                  {visibleColumns.notes && <th className="p-3.5 w-44">الحالة (الملاحظات)</th>}
                  {visibleColumns.rejectionReason && <th className="p-3.5 w-44">سبب الترسية / الاستبعاد</th>}
                  {visibleColumns.boqStatus && <th className="p-3.5 w-24 text-center">جدول الكميات</th>}
                  {visibleColumns.city && <th className="p-3.5 w-24">المدينة</th>}
                  {visibleColumns.platform && <th className="p-3.5 w-28">المنصة</th>}
                  {visibleColumns.actions && (
                    <th className="p-3.5 w-28 text-center sticky left-0 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-30 shadow-md">
                      الإجراءات
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-900 dark:text-slate-100">
                {paginatedTenders.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="p-12 text-center text-slate-400">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-sm text-slate-700 dark:text-slate-300">لا توجد منافسات مطابقة للبحث أو الفلتر المحدد</p>
                      <p className="text-xs mt-1 text-slate-500">جرّب تغيير كلمات البحث أو اختيار شيت آخر</p>
                    </td>
                  </tr>
                ) : (
                  paginatedTenders.map((item, idx) => {
                    const bid = Number(item.bidValue) || 0;
                    const win = Number(item.winningBidValue) || 0;
                    const gap = bid > 0 && win > 0 ? bid - win : 0;
                    const gapPercent = win > 0 && gap !== 0 ? ((gap / win) * 100).toFixed(1) : null;

                    return (
                      <tr 
                        key={item.id || idx}
                        className="hover:bg-emerald-500/5 transition-colors group cursor-pointer"
                        onClick={() => {
                          setSelectedItem(item);
                          setIsDetailModalOpen(true);
                        }}
                      >
                        {visibleColumns.seq && (
                          <td className="p-3 text-center text-slate-400 font-mono">
                            {item.seq || (idx + 1 + (currentPage - 1) * pageSize)}
                          </td>
                        )}

                        {visibleColumns.company && (
                          <td className="p-3 font-semibold text-slate-900 dark:text-white truncate" title={item.company}>
                            {item.company || 'كاس للتجارة'}
                          </td>
                        )}

                        {visibleColumns.tenderCode && (
                          <td className="p-3 font-mono font-black text-emerald-600 dark:text-emerald-400">
                            {item.tenderCode || '-'}
                          </td>
                        )}

                        {visibleColumns.title && (
                          <td className="p-3 font-semibold text-slate-900 dark:text-white">
                            <div className="line-clamp-2 leading-relaxed" title={item.title}>
                              {item.title}
                            </div>
                          </td>
                        )}

                        {visibleColumns.referenceNumber && (
                          <td className="p-3 font-mono text-slate-500 dark:text-slate-400">
                            {item.referenceNumber || item.tenderNumber || '-'}
                          </td>
                        )}

                        {visibleColumns.entity && (
                          <td className="p-3 text-slate-800 dark:text-slate-200 truncate" title={item.entity}>
                            {item.entity || '-'}
                          </td>
                        )}

                        {visibleColumns.manager && (
                          <td className="p-3 text-slate-500 text-[11px] whitespace-nowrap">
                            <div className="font-semibold text-slate-900 dark:text-white truncate">{item.managerName || '-'}</div>
                            {item.managerPhone && <div className="text-[10px] font-mono text-slate-400">{item.managerPhone}</div>}
                          </td>
                        )}

                        {visibleColumns.deadlineDate && (
                          <td className="p-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                            {item.deadlineDate || '-'}
                          </td>
                        )}

                        {visibleColumns.duration && (
                          <td className="p-3 text-slate-500 text-[11px] whitespace-nowrap">
                            {item.executionDuration || (item.durationDays ? `${item.durationDays} يوم` : '-')}
                          </td>
                        )}

                        {visibleColumns.bidValue && (
                          <td className="p-3 text-left font-mono font-black text-slate-900 dark:text-white whitespace-nowrap">
                            {bid > 0 ? `${bid.toLocaleString()} ⃁` : '-'}
                          </td>
                        )}

                        {visibleColumns.winningBidValue && (
                          <td className="p-3 text-left font-mono text-emerald-600 dark:text-emerald-400 font-black whitespace-nowrap">
                            {win > 0 ? (
                              <div className="flex flex-col items-start gap-0.5">
                                <span>{win.toLocaleString()} ⃁</span>
                                {gapPercent && Number(gapPercent) > 0 && (
                                  <span className="text-[10px] text-amber-700 bg-amber-50 dark:bg-amber-950/80 px-1 rounded-sm border border-amber-200 dark:border-amber-800">
                                    +{gapPercent}% فارق
                                  </span>
                                )}
                              </div>
                            ) : '-'}
                          </td>
                        )}

                        {visibleColumns.notes && (
                          <td className="p-3 whitespace-nowrap">
                            {getStatusBadge(item.notes, item.rejectionReason)}
                          </td>
                        )}

                        {visibleColumns.rejectionReason && (
                          <td className="p-3 text-slate-500 text-[11px] truncate" title={item.rejectionReason}>
                            {item.rejectionReason || '-'}
                          </td>
                        )}

                        {visibleColumns.boqStatus && (
                          <td className="p-3 text-center whitespace-nowrap">
                            {item.boqStatus === 'تم' ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-black text-[10px] border border-emerald-200 dark:border-emerald-800">
                                ✓ تم
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                          </td>
                        )}

                        {visibleColumns.city && (
                          <td className="p-3 text-slate-500 text-[11px] whitespace-nowrap">
                            {item.city || '-'}
                          </td>
                        )}

                        {visibleColumns.platform && (
                          <td className="p-3 text-slate-500 text-[11px] whitespace-nowrap">
                            {item.platformType || '-'}
                          </td>
                        )}

                        {visibleColumns.actions && (
                          <td 
                            className="p-3 text-center sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 z-10 border-r border-slate-200 dark:border-slate-800 shadow-md"
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedItem(item);
                                  setIsDetailModalOpen(true);
                                }}
                                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer transition"
                                title="معاينة التفاصيل"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-1.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/60 text-slate-500 hover:text-amber-600 cursor-pointer transition"
                                title="تعديل"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              {onConvertToBOQ && (
                                <button
                                  onClick={() => onConvertToBOQ(item)}
                                  className="p-1.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-600 cursor-pointer transition"
                                  title="تحويل لكراسة BOQ والتفقيط"
                                >
                                  <Calculator className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                onClick={() => handleDelete(item)}
                                className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 cursor-pointer transition"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <span>عرض</span>
          <select
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
            <option value={filteredTenders.length}>الكل ({filteredTenders.length})</option>
          </select>
          <span>سجل لكل صفحة</span>
          <span className="mx-2">•</span>
          <span>الصفحة <strong className="text-slate-900 dark:text-white font-mono">{currentPage}</strong> من <strong className="text-slate-900 dark:text-white font-mono">{totalPages}</strong></span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 font-mono font-bold"
          >
            «
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 font-mono flex items-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="px-4 py-1.5 font-mono font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 font-mono flex items-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 font-mono font-bold"
          >
            »
          </button>
        </div>
      </div>

      {/* Modal: View Tender Detail Card */}
      {isDetailModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto text-slate-900 dark:text-white relative">
            {/* Top Accent Strip */}
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 rounded-t-3xl" />

            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-black">
                  {selectedItem.company || 'مؤسسة خالد السليم للتجارة (كاس)'}
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2 leading-relaxed">
                  {selectedItem.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">كود: <strong className="text-slate-800 dark:text-slate-200">{selectedItem.tenderCode || '-'}</strong></span>
                  <span>•</span>
                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">مرجع اعتماد: <strong className="text-slate-800 dark:text-slate-200">{selectedItem.referenceNumber || '-'}</strong></span>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1">الجهة الحكومية:</span>
                <span className="font-black text-slate-900 dark:text-white block truncate">{selectedItem.entity || '-'}</span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1">المسؤول:</span>
                <span className="font-black text-slate-900 dark:text-white block truncate">{selectedItem.managerName || '-'}</span>
                {selectedItem.managerPhone && <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-[11px] block mt-0.5">{selectedItem.managerPhone}</span>}
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1">المدينة:</span>
                <span className="font-black text-slate-900 dark:text-white block truncate">{selectedItem.city || '-'}</span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1">تاريخ البدء:</span>
                <span className="font-mono font-black text-slate-900 dark:text-white block">{selectedItem.startDate || '-'}</span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1">تاريخ انتهاء التقديم:</span>
                <span className="font-mono font-black text-slate-900 dark:text-white block">{selectedItem.deadlineDate || '-'}</span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1">مدة التنفيذ:</span>
                <span className="font-black text-slate-900 dark:text-white block truncate">{selectedItem.executionDuration || '-'}</span>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs shadow-inner">
              <div>
                <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1">قيمة العرض المقدم (كاس):</span>
                <span className="text-lg font-black font-mono text-slate-900 dark:text-white block">
                  {selectedItem.bidValue ? `${selectedItem.bidValue.toLocaleString()} ⃁` : 'غير محدد'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1">المبلغ الحاصل على المنافسة:</span>
                <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 block">
                  {selectedItem.winningBidValue ? `${selectedItem.winningBidValue.toLocaleString()} ⃁` : 'غير محدد'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 font-bold block mb-1">الحالة والترسية:</span>
                <div className="mt-1">
                  {getStatusBadge(selectedItem.notes, selectedItem.rejectionReason)}
                </div>
              </div>
            </div>

            {selectedItem.notes && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-xs">
                <span className="font-black text-slate-700 dark:text-slate-300 block mb-1">الملاحظات والتفاصيل:</span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">{selectedItem.notes}</p>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenEdit(selectedItem);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>تعديل السجل</span>
                </button>

                {onConvertToBOQ && (
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      onConvertToBOQ(selectedItem);
                    }}
                    className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition"
                  >
                    <Calculator className="w-4 h-4" />
                    <span>تحويل لمحرر جداول الكميات (BOQ)</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Tender */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto text-slate-900 dark:text-white relative">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 rounded-t-3xl" />

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>{isAddModalOpen ? 'إضافة منافسة جديدة إلى السجل' : 'تعديل بيانات المنافسة'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="col-span-full">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">اسم المنافسة والمشروع *</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                  placeholder="مثال: تأمين مستلزمات اليوم الوطني لميناء جدة..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 text-sm font-semibold text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">المؤسسة / الشركة</label>
                <select
                  value={formData.company || ''}
                  onChange={e => setFormData(p => ({ ...p, company: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="مؤسسة خالد السليم للتجارة">مؤسسة خالد السليم للتجارة (كاس)</option>
                  <option value="مؤسسة كاس لتنظيم المعارض والمؤتمرات">مؤسسة كاس لتنظيم المعارض والمؤتمرات</option>
                  <option value="مؤسسة خالد السليم للدعاية والإعلان">مؤسسة خالد السليم للدعاية والإعلان</option>
                  <option value="مؤسسة بنايات ذكية للمقاولات">مؤسسة بنايات ذكية للمقاولات</option>
                  <option value="وكالة الأميال للسفر والسياحة">وكالة الأميال للسفر والسياحة</option>
                  <option value="مؤسسة اللمسة الخارقة للاتصالات والتقنية">مؤسسة اللمسة الخارقة للاتصالات والتقنية</option>
                  <option value="الادارة الطبية">الادارة الطبية</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">كود المنافسة</label>
                <input
                  type="text"
                  value={formData.tenderCode || ''}
                  onChange={e => setFormData(p => ({ ...p, tenderCode: e.target.value }))}
                  placeholder="مثال: A1246, F0258..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">الرقم المرجعي (اعتماد)</label>
                <input
                  type="text"
                  value={formData.referenceNumber || ''}
                  onChange={e => setFormData(p => ({ ...p, referenceNumber: e.target.value }))}
                  placeholder="مثال: 240739001563"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">الجهة الحكومية</label>
                <input
                  type="text"
                  value={formData.entity || ''}
                  onChange={e => setFormData(p => ({ ...p, entity: e.target.value }))}
                  placeholder="مثال: وزارة الحرس الوطني..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">اسم المسؤول</label>
                <input
                  type="text"
                  value={formData.managerName || ''}
                  onChange={e => setFormData(p => ({ ...p, managerName: e.target.value }))}
                  placeholder="اسم مسؤول المنافسة..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">هاتف المسؤول</label>
                <input
                  type="text"
                  value={formData.managerPhone || ''}
                  onChange={e => setFormData(p => ({ ...p, managerPhone: e.target.value }))}
                  placeholder="05XXXXXXXX"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">قيمة عرض كاس (⃁)</label>
                <input
                  type="number"
                  value={formData.bidValue || ''}
                  onChange={e => setFormData(p => ({ ...p, bidValue: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">المبلغ الفائز (⃁)</label>
                <input
                  type="number"
                  value={formData.winningBidValue || ''}
                  onChange={e => setFormData(p => ({ ...p, winningBidValue: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">تاريخ انتهاء التقديم</label>
                <input
                  type="date"
                  value={formData.deadlineDate || ''}
                  onChange={e => setFormData(p => ({ ...p, deadlineDate: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">الحالة (الملاحظات)</label>
                <select
                  value={formData.notes || ''}
                  onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="مرحلة فحص العروض">مرحلة فحص العروض</option>
                  <option value="تم اعتماد الترسية">تم اعتماد الترسية</option>
                  <option value="معتمدة">معتمدة</option>
                  <option value="تم الإلغاء">تم الإلغاء</option>
                  <option value="بانتظار اعتماد تقييم العروض الفنية">بانتظار اعتماد تقييم العروض الفنية</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">سبب الترسية / الاستبعاد</label>
                <select
                  value={formData.rejectionReason || ''}
                  onChange={e => setFormData(p => ({ ...p, rejectionReason: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="معلقة">معلقة</option>
                  <option value="تم الترسية">تم الترسية</option>
                  <option value="عرض مالي مرتفع">عرض مالي مرتفع</option>
                  <option value="غير مطابق فنياً">غير مطابق فنياً</option>
                  <option value="غير مطابق مالياً و فنياً">غير مطابق مالياً و فنياً</option>
                  <option value="تم الإلغاء">تم الإلغاء</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">المدينة</label>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={e => setFormData(p => ({ ...p, city: e.target.value }))}
                  placeholder="الرياض، جدة، الدمام..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={isAddModalOpen ? handleSaveAdd : handleSaveEdit}
                className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition"
              >
                <Check className="w-4 h-4" />
                <span>{isAddModalOpen ? 'حفظ وإضافة المنافسة' : 'حفظ التعديلات'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Import Excel File */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-white relative">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 rounded-t-3xl" />

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileUp className="w-5 h-5 text-emerald-600" />
                <span>استيراد ملف إكسل المنافسات</span>
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              يمكنك رفع أي ملف إكسل (.xlsx / .xls) مطابق لتنسيق Google Sheet الخاص بمنافسات كاس لتحديث البيانات وإضافة المنافسات تلقائياً.
            </p>

            <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl text-center bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/60 transition-colors">
              <Upload className="w-10 h-10 mx-auto text-emerald-600 mb-3" />
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <span className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl inline-block shadow-lg shadow-emerald-600/20 font-black">
                  اختر ملف Excel من جهازك
                </span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <span className="text-[11px] text-slate-400 block mt-2">يدعم صيغ .xlsx أو .xls</span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Printable Official Tenders Report */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-4xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:border-none">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-bold text-xl shadow-md">
                  KAS
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">مؤسسة خالد عبدالعزيز السليم للتجارة والمقاولات</h2>
                  <p className="text-xs text-slate-500">كشف وسجل المنافسات الحكومية المعتمد - شيت {selectedSheetName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الآن</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Print Header KPIs */}
            <div className="grid grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">إجمالي المنافسات:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">{filteredTenders.length}</span>
              </div>
              <div>
                <span className="text-slate-500 block">قيمة العروض:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">{kpis.totalBidValue.toLocaleString()} ⃁</span>
              </div>
              <div>
                <span className="text-slate-500 block">الترسيات المعتمدة:</span>
                <span className="font-bold text-emerald-700 font-mono text-sm">{kpis.wonCount} ترسية</span>
              </div>
              <div>
                <span className="text-slate-500 block">تاريخ التقرير:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">{new Date().toISOString().split('T')[0]}</span>
              </div>
            </div>

            {/* Print Table */}
            <table className="w-full text-xs text-right border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 font-bold">
                  <th className="p-2 border border-slate-200 text-center">#</th>
                  <th className="p-2 border border-slate-200">كود / مرجع</th>
                  <th className="p-2 border border-slate-200">اسم المنافسة</th>
                  <th className="p-2 border border-slate-200">الجهة الحكومية</th>
                  <th className="p-2 border border-slate-200 text-left">قيمة العرض</th>
                  <th className="p-2 border border-slate-200 text-left">المبلغ الفائز</th>
                  <th className="p-2 border border-slate-200">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenders.slice(0, 100).map((t, i) => (
                  <tr key={t.id || i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-2 border border-slate-200 text-center font-mono text-slate-500">{i + 1}</td>
                    <td className="p-2 border border-slate-200 font-mono text-slate-700">{t.tenderCode || t.referenceNumber || '-'}</td>
                    <td className="p-2 border border-slate-200 font-medium text-slate-900">{t.title}</td>
                    <td className="p-2 border border-slate-200 text-slate-700">{t.entity || '-'}</td>
                    <td className="p-2 border border-slate-200 text-left font-mono">{t.bidValue ? `${t.bidValue.toLocaleString()} ⃁` : '-'}</td>
                    <td className="p-2 border border-slate-200 text-left font-mono text-emerald-700 font-semibold">{t.winningBidValue ? `${t.winningBidValue.toLocaleString()} ⃁` : '-'}</td>
                    <td className="p-2 border border-slate-200 text-slate-700 text-[11px]">{t.notes || t.rejectionReason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredTenders.length > 100 && (
              <p className="text-[11px] text-slate-400 text-center">
                * تم عرض أول 100 منافسة في هذا الكشف. لتصدير كامل السجلات ({filteredTenders.length}) يرجى استخدام تصدير Excel.
              </p>
            )}

            <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-200 pt-4">
              <span>نظام ERP مجموعة خالد السليم - إدارة المنافسات والعقود</span>
              <span>صفحة 1 من 1</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KasMonafasatSpreadsheetView;
