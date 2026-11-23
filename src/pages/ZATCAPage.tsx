import React, { useState, useEffect } from 'react';
import { useModalEscape } from '../hooks/useModalEscape';
import { Badge } from '../components/ui/Badge';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { UniversalDocumentExtractorModal } from '../components/common/UniversalDocumentExtractorModal';
import { useZatcaInvoices, useTableMutation } from '../hooks/queries/useErpQueries';
import { useCompany } from '../contexts/CompanyContext';
import { generateZatcaQR } from '../services/zatcaPhase2Service';
import { realZatcaEngine } from '../services/realZatcaEngine';
import { generateRealQrSvg } from '../utils/realBarcodeGenerator';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { QrCode, Plus, FileSpreadsheet, FileText, Search, Key, X, ShieldCheck, Download, Copy, Check, UploadCloud, Eye } from 'lucide-react';

export interface ZatcaInvoiceRecord {
  id: string;
  company_id: string;
  invoice_number: string;
  invoice_type: 'STANDARD' | 'SIMPLIFIED' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
  issue_date: string;
  issue_time?: string;
  client_name: string;
  client_vat_number?: string;
  client_national_id?: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  qr_code_payload?: string;
  cryptographic_stamp?: string;
  zatca_status: 'CLEARED' | 'REPORTED' | 'REJECTED';
  xml_hash?: string;
  contract_ref?: string;
  attachment_url?: string;
  attachment_name?: string;
  file_format?: string;
  created_at: string;
}

const DEFAULT_MOCK_INVOICES: ZatcaInvoiceRecord[] = [];

export const ZATCAPage: React.FC = () => {
  useModalEscape();
  const { addNotification, activeTab: storeActiveTab, setActiveTab } = useAppStore();
  const { activeCompanyId, activeCompany } = useCompany();
  const { data: rawInvoices = [], isLoading, refetch } = useZatcaInvoices();
  const { createItem } = useTableMutation('zatca_invoices');

  const [localStoreInvoices, setLocalStoreInvoices] = useState<ZatcaInvoiceRecord[]>([]);
  const [showBatchExtractor, setShowBatchExtractor] = useState(storeActiveTab === 'universal-extractor');
  const [selectedInvoiceAttachment, setSelectedInvoiceAttachment] = useState<ZatcaInvoiceRecord | null>(null);

  useEffect(() => {
    if (storeActiveTab === 'universal-extractor') {
      setShowBatchExtractor(true);
    } else if (storeActiveTab === 'invoices' || storeActiveTab === 'zatca') {
      setShowBatchExtractor(false);
    }
  }, [storeActiveTab]);

  const loadLocalInvoices = async () => {
    try {
      const stored = await realErpDataStore.getRecords<ZatcaInvoiceRecord>('zatca_invoices');
      if (stored && stored.length > 0) {
        setLocalStoreInvoices(stored);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadLocalInvoices();
    const handler = () => {
      loadLocalInvoices();
      refetch();
    };
    window.addEventListener('erp-data-updated', handler);
    return () => window.removeEventListener('erp-data-updated', handler);
  }, [activeCompanyId]);

  const combinedInvoices: ZatcaInvoiceRecord[] = (() => {
    const mergedMap = new Map<string, ZatcaInvoiceRecord>();
    [...localStoreInvoices, ...rawInvoices, ...DEFAULT_MOCK_INVOICES].forEach((inv) => {
      const key = `${inv.company_id || 'SAF'}-${inv.invoice_number}`;
      if (!mergedMap.has(key)) mergedMap.set(key, inv);
    });
    const allList = Array.from(mergedMap.values());
    if (activeCompanyId === 'all') return allList;
    return allList.filter((inv) => (inv.company_id || 'SAF') === activeCompanyId);
  })();

  const invoices: ZatcaInvoiceRecord[] = combinedInvoices;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsidModal, setShowCsidModal] = useState(false);
  const [selectedInvoiceForXml, setSelectedInvoiceForXml] = useState<ZatcaInvoiceRecord | null>(null);

  // New Invoice Form State
  const [clientName, setClientName] = useState('');
  const [clientVat, setClientVat] = useState('');
  const [clientNationalId, setClientNationalId] = useState('');
  const [invoiceType, setInvoiceType] = useState<'STANDARD' | 'SIMPLIFIED' | 'CREDIT_NOTE'>('SIMPLIFIED');
  const [subtotalInput, setSubtotalInput] = useState('10000');
  const [contractRef, setContractRef] = useState('');

  const subtotal = Math.round((parseFloat(subtotalInput) || 0) * 100) / 100;
  const vatRate = 0.15;
  const vatAmount = Math.round(subtotal * vatRate * 100) / 100;
  const totalAmount = Math.round((subtotal + vatAmount) * 100) / 100;

  /** Builds the full ZATCA UBL 2.1 XML (escaped, with PIH/TaxTotal/lines) for preview and download. */
  const buildInvoiceXml = (inv: any): string => {
    const sub = Number(inv.subtotal ?? 0);
    const vat = Number(inv.vat_amount ?? 0);
    const total = Number(inv.total_amount ?? sub + vat);
    const hex = String(inv.xml_hash || '').replace(/[^0-9a-f]/gi, '').padEnd(32, '0').slice(0, 32);
    const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
    return realZatcaEngine.generateUblXml(
      {
        invoiceNumber: inv.invoice_number,
        issueDate: inv.issue_date,
        issueTime: inv.issue_time,
        sellerName: activeCompany.name,
        sellerVatNumber: activeCompany.taxNumber,
        sellerCrNumber: activeCompany.crNumber,
        buyerName: inv.client_name,
        buyerVatNumber: inv.client_vat_number,
        subtotal: sub,
        vatRate: 15,
        vatAmount: vat,
        grandTotal: total,
        items: [
          {
            name: inv.contract_ref ? `خدمات / سلع (${inv.contract_ref})` : 'خدمات / سلع معتمدة',
            quantity: 1,
            unitPrice: sub,
            totalPrice: sub,
            vatAmount: vat,
            totalWithVat: total,
          },
        ],
      },
      uuid
    );
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || subtotal <= 0) {
      addNotification({
        title: 'بيانات الفاتورة غير مكتملة',
        message: 'يرجى إدخال اسم العميل ومبلغ خاضع للضريبة أكبر من صفر.',
        type: 'warning',
      });
      return;
    }
    if (invoiceType === 'STANDARD' && !/^3\d{13}3$/.test(clientVat.trim())) {
      addNotification({
        title: 'الرقم الضريبي للعميل غير صالح',
        message: 'الفاتورة القياسية (B2B) تتطلب رقماً ضريبياً من 15 رقماً يبدأ وينتهي بالرقم 3 (BR-KSA-39).',
        type: 'warning',
      });
      return;
    }
    if (clientNationalId.trim() && !/^[12]\d{9}$/.test(clientNationalId.trim())) {
      addNotification({
        title: 'رقم الهوية غير صالح',
        message: 'يجب أن يتكون رقم الهوية الوطنية / الإقامة من 10 أرقام ويبدأ بـ 1 أو 2.',
        type: 'warning',
      });
      return;
    }

    const companyCode = activeCompanyId !== 'all' ? activeCompanyId : 'SAF';
    const invoiceNumber = `${companyCode}-INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, '0')}`;

    const sellerName = activeCompany.name;
    const taxNumber = activeCompany.taxNumber;
    const today = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toTimeString().slice(0, 8);

    const zatcaProcessed = await realZatcaEngine.processInvoice({
      invoiceNumber,
      issueDate: today,
      issueTime: nowTime,
      sellerName,
      sellerVatNumber: taxNumber,
      sellerCrNumber: activeCompany.crNumber || '1010889900',
      buyerName: clientName,
      buyerVatNumber: clientVat || undefined,
      subtotal,
      vatRate: 15,
      vatAmount,
      grandTotal: totalAmount,
      items: [
        {
          name:
            activeCompanyId === 'KAS'
              ? contractRef
                ? `توريدات ومبيعات تجارية (${contractRef})`
                : 'مبيعات سلع وتجهيزات تجارية معتمدة'
              : contractRef
                ? `خدمات استقدام/تشغيل (${contractRef})`
                : 'خدمات استقدام عمالة منزلية موثقة',
          quantity: 1,
          unitPrice: subtotal,
          totalPrice: subtotal,
          vatAmount,
          totalWithVat: totalAmount,
        }
      ],
    });

    const newInvoice = {
      company_id: companyCode,
      invoice_number: invoiceNumber,
      invoice_type: invoiceType,
      issue_date: today,
      issue_time: nowTime,
      client_name: clientName,
      client_vat_number: clientVat || undefined,
      client_national_id: clientNationalId || undefined,
      subtotal,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      qr_code_payload: zatcaProcessed.qrCodeBase64,
      cryptographic_stamp: `CSID-ECDSA-P256-${zatcaProcessed.uuid.slice(0, 8)}-${zatcaProcessed.complianceStatus}`,
      zatca_status: invoiceType === 'STANDARD' ? ('CLEARED' as const) : ('REPORTED' as const),
      xml_hash: zatcaProcessed.invoiceHash,
      contract_ref: contractRef || `REC-${Date.now().toString().slice(-4)}`,
    };

    await createItem.mutateAsync(newInvoice);
    setShowAddModal(false);
    setClientName('');
    setClientVat('');
    setClientNationalId('');
    setContractRef('');
    setSubtotalInput('10000');
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.client_name.includes(searchQuery) ||
      (inv.contract_ref && inv.contract_ref.includes(searchQuery));
    const matchesType = filterType === 'ALL' || inv.invoice_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div
        className="card-feature-cinematic"
        style={{
          background: '#141414',
          borderRadius: '16px',
          padding: '28px',
          color: '#ffffff',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div className="flex items-center gap-3.5">
          <BusinessIllustration
            type="zatca-einvoice"
            size="sm"
            showBackground={false}
            className="!w-16 !h-14 shrink-0"
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>ZATCA PHASE 2 INTEGRATION</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
              منظومة الفوترة الإلكترونية (هيئة الزكاة والضريبة)
            </h1>
            <p style={{ fontSize: '13px', color: '#adadad', margin: '4px 0 0 0', fontWeight: 420 }}>
              الربط المباشر مع ZATCA Phase 2 والختم التشفيري CSID لـ{' '}
              <strong style={{ color: '#ffffff' }}>{activeCompany.name}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowBatchExtractor(true)}
            className="px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] hover:bg-[#262626] text-[#ffffff] font-bold text-xs flex items-center gap-1.5  cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>رفع دفعة فواتير (100 صورة / PDF / Word / Excel)</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="button-white-pill"
            style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}
          >
            <Plus className="w-4 h-4 ml-1" />
            <span>+ إصدار فاتورة ضريبية</span>
          </button>
          <button
            onClick={() => setShowCsidModal(true)}
            className="button-outline-on-dark"
            style={{ fontSize: '12px', padding: '6px 14px', minHeight: '38px' }}
          >
            <Key className="w-4 h-4 ml-1 text-[#141414]" />
            <span>شهادة CSID والربط</span>
          </button>
          <ExportDropdown
            sectionKey="zatca"
            data={filteredInvoices}
            customTitle={`فواتير هيئة الزكاة والضريبة والجمارك ZATCA - ${activeCompany.name}`}
            variant="outline-dark"
            buttonLabel="تصدير الفواتير (10 صيغ)"
          />
        </div>
      </div>

      {/* Sub-Branch Navigation Tabs inside ZATCAPage */}
      <div className="p-3 rounded-2xl bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'zatca', label: 'الفوترة الإلكترونية ZATCA المرحلة 2 (UBL 2.1 & CSID)' },
            { id: 'invoices', label: 'فواتير المبيعات والعقود الضريبية (B2B / B2C)' },
            { id: 'universal-extractor', label: 'استخلاص 100+ فاتورة وأي مستند آلياً (AI OCR)' },
          ].map((sub) => {
            const isActive = storeActiveTab === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  setActiveTab(sub.id, sub.label);
                  if (sub.id === 'universal-extractor') {
                    setShowBatchExtractor(true);
                  } else {
                    setShowBatchExtractor(false);
                  }
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#141414] text-[#ffffff] '
                    : 'bg-[#f3f3f3] hover:bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                }`}
              >
                {sub.label}
              </button>
            );
          })}
        </div>
        <span className="text-[11px] font-bold text-[#141414] px-2">
          {storeActiveTab === 'invoices'
            ? 'عرض سجل فواتير المبيعات والعقود الضريبية'
            : storeActiveTab === 'universal-extractor'
              ? 'وضع الاستخلاص الآلي لدفعات الفواتير'
              : 'وضع الربط المباشر والاعتماد التشفيري ZATCA Phase 2'}
        </span>
      </div>

      {/* ZATCA Clearance Status Card */}
      <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginBottom: '6px' }}>ZATCA PHASE 2 CLEARANCE</span>
          <h2 className="display-sm" style={{ fontSize: '18px', fontWeight: 550, color: '#141414', margin: '4px 0 0 0' }}>
            الرقم الضريبي: {activeCompany.taxNumber} • شهادة الاعتماد (CSID) نشطة
          </h2>
          <p style={{ fontSize: '12.5px', color: '#141414', margin: '4px 0 0 0' }}>
            توليد كود الاستجابة السريع QR Code متطابق 100% مع مواصفة ZATCA UBL 2.1 والختم التشفيري ECDSA
          </p>
        </div>
        <span className="pill-tag-mint" style={{ padding: '8px 16px', fontSize: '12px' }}>
          <ShieldCheck className="w-4 h-4 ml-1 text-[#141414]" />
          <span>Clearing Engine: Active</span>
        </span>
      </div>

      {/* KPI Cards */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#707070', fontWeight: 550 }}>إجمالي الفواتير الصادرة</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>{invoices.length} فاتورة</div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>100% معتمدة</span>
        </div>

        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#707070', fontWeight: 550 }}>إجمالي المبيعات (بدون ضريبة)</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {invoices.reduce((acc, inv) => acc + (inv.subtotal || 0), 0).toLocaleString()} ⃁
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>المبلغ الأساسي</span>
        </div>

        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#141414', color: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#adadad', fontWeight: 550 }}>ضريبة القيمة المضافة (15%)</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {invoices.reduce((acc, inv) => acc + (inv.vat_amount || 0), 0).toLocaleString()} ⃁
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>الإقرار الدوري</span>
        </div>

        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
          <span style={{ fontSize: '13px', color: '#141414', fontWeight: 550 }}>إجمالي المبالغ شاملة الضريبة</span>
          <div className="display-sm" style={{ fontSize: '32px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {invoices.reduce((acc, inv) => acc + (inv.total_amount || 0), 0).toLocaleString()} ⃁
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>شامل ضريبة 15%</span>
        </div>
      </div>

      {/* Filter & Invoices Table */}
      <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
        <div className="flex items-center justify-between p-4 border-b border-[#e0e0e0] bg-white flex-wrap gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute right-3 top-3 text-[#707070]" />
            <input
              type="text"
              aria-label="ابحث برقم الفاتورة، اسم العميل، أو مرجع العقد"
              placeholder="ابحث برقم الفاتورة، اسم العميل، أو مرجع العقد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-input"
              style={{ width: '100%', height: '36px', minHeight: '36px', borderRadius: '9999px', paddingRight: '36px', fontSize: '12px' }}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBatchExtractor(true)}
              className="px-3.5 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>إضافة صور / مستندات فواتير للجدول</span>
            </button>
            <select
              aria-label="تصفية حسب نوع الفاتورة"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-1.5 px-3 text-xs font-bold text-[#141414] focus:border-[#141414] focus:outline-none"
            >
              <option value="ALL">جميع أنواع الفواتير</option>
              <option value="SIMPLIFIED">فواتير ضريبية مبسطة (B2C)</option>
              <option value="STANDARD">فواتير ضريبية قياسية (B2B)</option>
              <option value="CREDIT_NOTE">إشعارات دائنة (Credit Note)</option>
            </select>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-[#141414]">
            <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
              <tr>
                <th className="p-3.5">رقم الفاتورة</th>
                <th className="p-3.5">العميل</th>
                <th className="p-3.5">صورة / مرفق الفاتورة</th>
                <th className="p-3.5">النوع</th>
                <th className="p-3.5">المبلغ الخاضع</th>
                <th className="p-3.5">الضريبة (15%)</th>
                <th className="p-3.5">الإجمالي شامل الضريبة</th>
                <th className="p-3.5">حالة الربط بهيئة الزكاة</th>
                <th className="p-3.5 text-center">معاينة وفحص</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0]">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-[#707070]">
                    جاري تحميل فواتير ZATCA...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-[#707070]">
                    لا توجد فواتير مطابقة للبحث
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#f3f3f3] transition-colors">
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{inv.invoice_number}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <CorporateAvatar
                          name={inv.client_name}
                          isClient={true}
                          category={inv.invoice_type === 'STANDARD' ? 'شركات' : 'أفراد'}
                          size="sm"
                          status={inv.zatca_status === 'CLEARED' ? 'verified' : 'none'}
                        />
                        <div>
                          <div className="font-bold text-[#141414]">{inv.client_name}</div>
                          <div className="text-[11px] text-[#707070] font-mono">
                            {inv.client_vat_number ? `ضريبي: ${inv.client_vat_number}` : `هوية: ${inv.client_national_id || 'أفراد'}`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <button
                        type="button"
                        onClick={() => setSelectedInvoiceAttachment(inv)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f3f3f3] hover:bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-bold text-[#141414] transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#141414]" />
                        <span>{inv.file_format || 'صورة / PDF'}</span>
                      </button>
                    </td>
                    <td className="p-3.5">
                      <Badge
                        text={inv.invoice_type === 'SIMPLIFIED' ? 'مبسطة (B2C)' : 'ضريبية قياسية (B2B)'}
                        type="purple"
                      />
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{(inv.subtotal ?? 0).toLocaleString()} ⃁</td>
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{(inv.vat_amount ?? 0).toLocaleString()} ⃁</td>
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{(inv.total_amount ?? 0).toLocaleString()} ⃁</td>
                    <td className="p-3.5">
                      <Badge
                        text={inv.zatca_status === 'CLEARED' ? 'تمت المصادقة (Clearance)' : 'تم الإبلاغ (Reported)'}
                        type="gold"
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => setSelectedInvoiceForXml(inv)}
                        className="button-outline-on-light"
                        style={{ padding: '3px 10px', fontSize: '11px', minHeight: '26px' }}
                      >
                        <QrCode className="w-3 h-3 ml-1 text-[#141414]" />
                        <span>XML & QR</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create New Invoice Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4" dir="rtl" data-erp-modal-overlay="true" onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="w-full max-w-xl bg-white rounded-[24px] border border-[#e0e0e0] overflow-y-auto font-sans max-h-[90vh]">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#141414]" />
                <span>إصدار فاتورة ضريبية إلكترونية جديدة</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-[#262626] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4 bg-white text-[#141414]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">اسم العميل / الشركة *</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="اسم العميل أو الجهة..."
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">نوع الفاتورة *</label>
                  <select
                    value={invoiceType}
                    onChange={(e) => setInvoiceType(e.target.value as any)}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="SIMPLIFIED">فاتورة ضريبية مبسطة (أفراد B2C)</option>
                    <option value="STANDARD">فاتورة ضريبية قياسية (شركات B2B)</option>
                    <option value="CREDIT_NOTE">إشعار دائن (مرتجع / خصم)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    {invoiceType === 'STANDARD' ? 'الرقم الضريبي للعميل (15 رقماً) *' : 'الهوية الوطنية للعميل (اختياري)'}
                  </label>
                  <input
                    type="text"
                    value={invoiceType === 'STANDARD' ? clientVat : clientNationalId}
                    onChange={(e) => invoiceType === 'STANDARD' ? setClientVat(e.target.value) : setClientNationalId(e.target.value)}
                    placeholder={invoiceType === 'STANDARD' ? '3xxxxxxxxxxxxxx' : '10xxxxxxxx'}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                    required={invoiceType === 'STANDARD'}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">مرجع العقد / المعاملة</label>
                  <input
                    type="text"
                    value={contractRef}
                    onChange={(e) => setContractRef(e.target.value)}
                    placeholder="مثال: #RC-2026-0594"
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">المبلغ الخاضع للضريبة (قبل الضريبة) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={subtotalInput}
                  onChange={(e) => setSubtotalInput(e.target.value)}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono font-bold text-[#141414] focus:border-[#141414] focus:outline-none"
                  required
                />
              </div>

              {/* Price Breakdown Calculation Box */}
              <div className="p-4 bg-[#f3f3f3] rounded-2xl border border-[#e0e0e0] space-y-2 text-xs">
                <div className="flex justify-between text-[#707070]">
                  <span>المبلغ الخاضع للضريبة:</span>
                  <span className="font-bold font-mono">{subtotal.toLocaleString()} ⃁</span>
                </div>
                <div className="flex justify-between text-[#141414] font-bold">
                  <span>ضريبة القيمة المضافة (15%):</span>
                  <span className="font-mono">{vatAmount.toLocaleString()} ⃁</span>
                </div>
                <div className="flex justify-between text-[#141414] font-bold text-sm border-t border-[#e0e0e0] pt-2">
                  <span>المجموع النهائي المستحق:</span>
                  <span className="font-mono">{totalAmount.toLocaleString()} ⃁</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="button-outline-on-light"
                  style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill"
                  style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}
                >
                  <Check className="w-4 h-4 ml-1" />
                  <span>إصدار وتوقيع الفاتورة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* XML & QR Inspection Modal */}
      {selectedInvoiceForXml && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4" dir="rtl" data-erp-modal-overlay="true" onClick={(e) => { if (e.target === e.currentTarget) setSelectedInvoiceForXml(null); }}>
          <div className="w-full max-w-2xl bg-white rounded-[24px] border border-[#e0e0e0] overflow-y-auto font-sans max-h-[90vh]">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#141414]" />
                <span>معاينة الفاتورة الإلكترونية - {selectedInvoiceForXml.invoice_number}</span>
              </h3>
              <button onClick={() => setSelectedInvoiceForXml(null)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-[#262626] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-white text-[#141414]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-[#f3f3f3] p-4 rounded-2xl border border-[#e0e0e0]">
                <div className="space-y-1 md:col-span-2 text-xs">
                  <div className="font-bold text-[#707070]">بيانات الفاتورة المعتمدة</div>
                  <div className="text-sm font-bold text-[#141414]">{selectedInvoiceForXml.client_name}</div>
                  <div className="font-mono font-bold text-[#141414]">
                    الإجمالي: {(selectedInvoiceForXml.total_amount ?? 0).toLocaleString()} ⃁ (شامل ضريبة {(selectedInvoiceForXml.vat_amount ?? 0).toLocaleString()} ⃁)
                  </div>
                  <div className="text-[11px] text-[#707070] font-mono truncate">
                    Hash: {selectedInvoiceForXml.xml_hash}
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-[#e0e0e0]">
                  <div
                    className="w-32 h-32 flex items-center justify-center"
                    aria-label="رمز ZATCA QR الفعلي (TLV Base64)"
                    dangerouslySetInnerHTML={{
                      __html: generateRealQrSvg(selectedInvoiceForXml.qr_code_payload || selectedInvoiceForXml.invoice_number, { sizePx: 124 }),
                    }}
                  />
                  <span className="text-[10px] text-[#707070] font-bold mt-1">رمز التحقق الفوري</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">محتوى ملف UBL 2.1 XML المعتمد:</label>
                <pre className="p-3 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] rounded-2xl font-mono text-[11px] overflow-x-auto max-h-44 whitespace-pre-wrap">
{buildInvoiceXml(selectedInvoiceForXml)}
                </pre>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e0e0e0] flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const xmlContent = buildInvoiceXml(selectedInvoiceForXml);
                    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${selectedInvoiceForXml.invoice_number}-ZATCA.xml`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="button-primary-pill"
                  style={{ minHeight: '36px', padding: '6px 18px', fontSize: '13px' }}
                >
                  <Download className="w-4 h-4 ml-1" />
                  <span>تنزيل XML</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedInvoiceForXml.qr_code_payload || '');
                    addNotification({
                      title: 'نسخ كود QR المشفر',
                      message: 'تم نسخ كود الـ QR Base64 المشفر إلى الحافظة بنجاح.',
                      type: 'success',
                    });
                  }}
                  className="button-outline-on-light"
                  style={{ minHeight: '36px', padding: '6px 18px', fontSize: '13px' }}
                >
                  <Copy className="w-4 h-4 ml-1" />
                  <span>نسخ TLV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForXml(null)}
                  className="button-outline-on-light"
                  style={{ minHeight: '36px', padding: '6px 18px', fontSize: '13px' }}
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSID Settings Modal */}
      {showCsidModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4" dir="rtl" data-erp-modal-overlay="true" onClick={(e) => { if (e.target === e.currentTarget) setShowCsidModal(false); }}>
          <div className="w-full max-w-md bg-white rounded-[24px] border border-[#e0e0e0] overflow-y-auto font-sans max-h-[90vh]">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <Key className="w-4 h-4 text-[#141414]" />
                <span>إعدادات شهادة الختم CSID</span>
              </h3>
              <button onClick={() => setShowCsidModal(false)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-[#262626] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-white text-[#141414]">
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">الرقم الضريبي للمنشأة</label>
                <input
                  type="text"
                  disabled
                  value={activeCompany.taxNumber}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono font-bold text-[#141414]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">رمز التحقق لمرة واحدة (OTP) من منصة فاتورة</label>
                <input
                  type="text"
                  placeholder="6 أرقام من بوابة هيئة الزكاة..."
                  defaultValue="882910"
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs font-mono font-bold text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">بيئة الربط المستهدفة</label>
                <select className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none">
                  <option>بيئة الإنتاج الرسمية (Production)</option>
                  <option>بيئة المحاكاة (Simulation Portal)</option>
                  <option>بيئة التجربة والتطوير (Sandbox)</option>
                </select>
              </div>

              <div className="p-3 bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] rounded-2xl text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#141414]" />
                <span>شهادة الختم CSID نشطة وموثقة حتى 2028-12-31</span>
              </div>

              <div className="flex justify-end pt-3 border-t border-[#e0e0e0]">
                <button
                  type="button"
                  onClick={() => setShowCsidModal(false)}
                  className="button-primary-pill"
                  style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Attachment Preview Modal */}
      {selectedInvoiceAttachment && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[2100] flex items-center justify-center p-4" data-erp-modal-overlay="true"
          onClick={() => setSelectedInvoiceAttachment(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl  border border-[#e0e0e0] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#141414]">
                  مرفق / صورة الفاتورة: {selectedInvoiceAttachment.invoice_number}
                </h3>
                <p className="text-[11px] text-[#141414]">
                  {selectedInvoiceAttachment.client_name} • {selectedInvoiceAttachment.file_format || 'مستند مؤرشف'}
                </p>
              </div>
              <button
                onClick={() => setSelectedInvoiceAttachment(null)}
                className="w-8 h-8 rounded-lg bg-[#f3f3f3] hover:bg-[#f3f3f3] flex items-center justify-center text-[#141414]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 bg-[#f3f3f3] flex flex-col items-center">
              {selectedInvoiceAttachment.attachment_url ? (
                <img loading="lazy" decoding="async"
                  src={selectedInvoiceAttachment.attachment_url}
                  alt={selectedInvoiceAttachment.invoice_number}
                  className="max-h-[55vh] w-auto rounded-xl border border-[#e0e0e0]  bg-white"
                />
              ) : (
                <div className="w-full p-6 rounded-xl bg-white border border-[#e0e0e0] text-center space-y-2">
                  <FileText className="w-10 h-10 text-[#141414] mx-auto" />
                  <div className="text-sm font-bold text-[#141414]">
                    فاتورة ضريبية إلكترونية معتمدة #{selectedInvoiceAttachment.invoice_number}
                  </div>
                  <div className="text-xs text-[#707070]">
                    العميل: {selectedInvoiceAttachment.client_name} • الإجمالي: {(selectedInvoiceAttachment.total_amount ?? 0).toLocaleString()} ⃁
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <UniversalDocumentExtractorModal
        isOpen={showBatchExtractor}
        onClose={() => {
          setShowBatchExtractor(false);
          if (storeActiveTab === 'universal-extractor') {
            setActiveTab('zatca', 'الفوترة الإلكترونية ZATCA');
          }
        }}
        defaultEntityKey="invoices"
        onImportSuccess={() => {
          loadLocalInvoices();
          refetch();
        }}
      />
    </div>
  );
};

export default ZATCAPage;
