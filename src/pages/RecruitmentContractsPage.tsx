import React, { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { useRecruitmentContracts, useTableMutation } from '../hooks/queries/useErpQueries';
import { useCompany } from '../contexts/CompanyContext';
import { DualBrandingDocumentGenerator } from '../components/common/DualBrandingDocumentGenerator';
import { MusanedMasterIntegrationHub } from '../components/musaned/MusanedMasterIntegrationHub';
import { useAppStore } from '../stores/appStore';
import { 
  FileSignature, Plus, FileSpreadsheet, FileText, Search, ArrowLeft, 
  Printer, X, LayoutGrid, List, Send, ShieldCheck, ShieldAlert, DollarSign, Plane, 
  RefreshCw, AlertCircle, Trash2, CheckCircle2, Check, Clock, Edit, 
  CheckCheck, Shield, ChevronRight, Filter, Zap
} from 'lucide-react';
import { realErpDataStore } from '../services/realErpDataStore';
import { musanedLifecycleEngine } from '../services/musanedLifecycleEngine';
import { journalEngine } from '../services/accounting/journalEngine';

export interface RecruitmentContractItem {
  id: string;
  company_id: string;
  contract_number: string;
  musaned_number?: string;
  client_name: string;
  client_phone: string;
  client_national_id?: string;
  client_type?: 'شخص' | 'شركة';
  delivery_city?: string;
  maid_name: string;
  maid_passport?: string;
  nationality: string;
  external_office?: string;
  amount: number;
  tax_amount?: number;
  total_amount?: number;
  stage: 'عقود جديدة' | 'مساند' | 'تفويض' | 'تفييز' | 'تذكرة' | 'وصول' | 'مكتمل' | 'مرتجع';
  warranty_status: string;
  payment_status: string;
  branch: string;
  created_at: string;
}

interface DispatchRecord {
  id: string;
  contract_number: string;
  client_name: string;
  maid_name: string;
  nationality: string;
  office_name: string;
  contract_status: string;
  dispatch_status: string;
  dispatch_date: string;
  arrival_station: string;
  cost_usd: number;
}

interface ExtensionRequest {
  id: string;
  contract_number: string;
  client_name: string;
  maid_name: string;
  extension_years: number;
  applicant: string;
  request_date: string;
  status: string;
}

interface ReturnRequest {
  id: string;
  contract_number: string;
  client_name: string;
  maid_name: string;
  notes: string;
  status: string;
  request_date: string;
  refund_amount?: number;
  cancelled_by?: 'client' | 'office' | 'worker_refusal';
}

interface InsurancePolicy {
  id: string;
  contract_number: string;
  client_name: string;
  maid_name: string;
  company: string;
  policy_no: string;
  coverage: string;
  status: string;
  start_date: string;
  end_date: string;
  premium_sar: number;
}

const STAGES_LIST: RecruitmentContractItem['stage'][] = [
  'عقود جديدة',
  'مساند',
  'تفويض',
  'تفييز',
  'تذكرة',
  'وصول',
  'مكتمل',
];

const MOCK_DISPATCHES: DispatchRecord[] = [
  {
    id: 'DISP-01',
    contract_number: 'SAF-RC-2026-0001',
    client_name: 'بندر صالح الهويريني',
    maid_name: 'MARIA SANTOS',
    nationality: 'الفلبين',
    office_name: "PLATINUM BROTHERS INT'L",
    contract_status: 'ساري',
    dispatch_status: 'تم إرسال الجواز للسفارة',
    dispatch_date: '2026-08-10',
    arrival_station: 'مطار الملك خالد الدولي بالرياض',
    cost_usd: 1200,
  },
  {
    id: 'DISP-02',
    contract_number: 'SAF-RC-2026-0002',
    client_name: 'سارة خالد الدوسري',
    maid_name: 'ALEMITU BEKELE',
    nationality: 'إثيوبيا',
    office_name: 'DAMAS FOREIGN AGENCY',
    contract_status: 'ساري',
    dispatch_status: 'حجز تذكرة طيران',
    dispatch_date: '2026-08-12',
    arrival_station: 'مطار الملك عبدالعزيز بجدة',
    cost_usd: 950,
  },
];

const MOCK_EXTENSIONS: ExtensionRequest[] = [
  {
    id: 'EXT-01',
    contract_number: 'SAF-RC-2025-0890',
    client_name: 'محمد عبدالله العتيبي',
    maid_name: 'JOYCE MWANGI',
    extension_years: 2,
    applicant: 'العميل مباشرة عبر مساند',
    request_date: '2026-08-05',
    status: 'معتمد',
  },
];

const MOCK_RETURNS: ReturnRequest[] = [
  {
    id: 'RET-01',
    contract_number: 'SAF-RC-2026-0033',
    client_name: 'فهد إبراهيم السبيعي',
    maid_name: 'FATIMA BEGUM',
    notes: 'عدم اجتياز الفحص الطبي في بلد المصدر',
    status: 'تم الاسترجاع المالي',
    request_date: '2026-08-08',
  },
];

const MOCK_INSURANCE: InsurancePolicy[] = [
  {
    id: 'INS-01',
    contract_number: 'SAF-RC-2026-0001',
    client_name: 'بندر صالح الهويريني',
    maid_name: 'MARIA SANTOS',
    company: 'شركة تكافل الراجحي للتأمين',
    policy_no: 'TR-REC-9982104',
    coverage: '24 شهراً (شامل الهروب ورفض العمل والوفاة)',
    status: 'سارية المفعول',
    start_date: '2026-01-15',
    end_date: '2028-01-14',
    premium_sar: 450,
  },
  {
    id: 'INS-02',
    contract_number: 'SAF-RC-2026-0002',
    client_name: 'سارة خالد الدوسري',
    maid_name: 'ALEMITU BEKELE',
    company: 'الشركة التعاونية للتأمين (Tawuniya)',
    policy_no: 'TAW-2026-887412',
    coverage: '24 شهراً (شامل تكاليف إعادة الاستقدام)',
    status: 'سارية المفعول',
    start_date: '2026-02-01',
    end_date: '2028-01-31',
    premium_sar: 450,
  },
  {
    id: 'INS-03',
    contract_number: 'SAF-RC-2026-0003',
    client_name: 'محمد عبدالله العتيبي',
    maid_name: 'JOYCE MWANGI',
    company: 'شركة سلامة للتأمين التعاوني',
    policy_no: 'SLM-REC-554190',
    coverage: '24 شهراً (حماية أصحاب العمل)',
    status: 'سارية المفعول',
    start_date: '2026-03-10',
    end_date: '2028-03-09',
    premium_sar: 450,
  },
];

export const RecruitmentContractsPage: React.FC = () => {
  const { activeCompanyId, activeCompany } = useCompany();
  const { data: rawContracts = [] } = useRecruitmentContracts();
  const { createItem, updateItem, deleteItem } = useTableMutation('contracts');
  const { addNotification } = useAppStore();

  const contracts: RecruitmentContractItem[] = rawContracts as RecruitmentContractItem[];

  const storeActiveTab = useAppStore(state => state.activeTab);

  const getMappedTab = (tabKey: string): 'all' | 'active' | 'completed' | 'returned' | 'dispatches' | 'extensions' | 'returns' | 'musaned' | 'insurance' | 'warranty' => {
    switch (tabKey) {
      case 'current-contracts': return 'active';
      case 'completed-contracts': return 'completed';
      case 'returned-contracts': return 'returned';
      case 'dispatches': return 'dispatches';
      case 'contract-extension-requests': return 'extensions';
      case 'contract-return-requests': return 'returns';
      case 'musaned-sync': return 'musaned';
      case 'contract-insurance': return 'insurance';
      case 'trial-period-90': return 'warranty';
      default: return 'all';
    }
  };

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'returned' | 'dispatches' | 'extensions' | 'returns' | 'musaned' | 'insurance' | 'warranty'>(() => getMappedTab(storeActiveTab));

  useEffect(() => {
    setActiveTab(getMappedTab(storeActiveTab));
    if (storeActiveTab === 'create-contract') {
      setShowAddModal(true);
    }
  }, [storeActiveTab]);

  const [activeStage] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(() => storeActiveTab === 'create-contract');
  const [editingContract, setEditingContract] = useState<RecruitmentContractItem | null>(null);
  const [selectedContractForPrint, setSelectedContractForPrint] = useState<RecruitmentContractItem | null>(null);

  // Add Contract Form State
  const [clientType, setClientType] = useState<'شخص' | 'شركة'>('شخص');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNationalId, setClientNationalId] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('الرياض');
  const [maidName, setMaidName] = useState('');
  const [maidPassport, setMaidPassport] = useState('');
  const [nationality, setNationality] = useState('الفلبين');
  const [externalOffice, setExternalOffice] = useState("PLATINUM BROTHERS INT'L");
  const [amountInput, setAmountInput] = useState('14500');
  const [branch, setBranch] = useState('فرع الرياض الرئيسي');
  const [availableCVs, setAvailableCVs] = useState<any[]>([]);
  const [registeredOffices, setRegisteredOffices] = useState<string[]>([
    "PLATINUM BROTHERS INT'L",
    'DAMAS FOREIGN AGENCY',
    'VERSATILE OVERSEAS LTD',
    'AL-MANAR RECRUITMENT',
    'COLOMBO MANPOWER BUREAU',
  ]);

  // Sub-modules state with realErpDataStore persistence
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
  const [extensions, setExtensions] = useState<ExtensionRequest[]>([]);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [insurancePolicies, setInsurancePolicies] = useState<InsurancePolicy[]>([]);

  // Modals for sub-modules
  const [showAddDispatchModal, setShowAddDispatchModal] = useState(false);
  const [showAddExtensionModal, setShowAddExtensionModal] = useState(false);
  const [showAddReturnModal, setShowAddReturnModal] = useState(false);
  const [showAddInsuranceModal, setShowAddInsuranceModal] = useState(false);

  // Forms for sub-modules
  const [dispatchForm, setDispatchForm] = useState({
    contract_number: '',
    client_name: '',
    maid_name: '',
    nationality: 'الفلبين',
    office_name: "PLATINUM BROTHERS INT'L",
    arrival_station: 'مطار الملك خالد الدولي بالرياض',
    cost_usd: '1200',
  });

  const [extensionForm, setExtensionForm] = useState({
    contract_number: '',
    client_name: '',
    maid_name: '',
    extension_years: '2',
    applicant: 'العميل مباشرة عبر مساند',
  });

  const [returnForm, setReturnForm] = useState({
    contract_number: '',
    client_name: '',
    maid_name: '',
    notes: 'عدم رغبة العاملة بالعمل خلال فترة التجربة النظامية',
    refund_amount: '12500',
    cancelled_by: 'client' as 'client' | 'office' | 'worker_refusal',
  });

  const [insuranceForm, setInsuranceForm] = useState({
    contract_number: '',
    client_name: '',
    maid_name: '',
    company: 'شركة تكافل الراجحي للتأمين',
    policy_no: '',
    coverage: '24 شهراً (شامل الهروب ورفض العمل وتكاليف الاستبدال)',
    premium_sar: '450',
  });

  useEffect(() => {
    realErpDataStore.getRecords<DispatchRecord>('dispatches', MOCK_DISPATCHES).then(setDispatches);
    realErpDataStore.getRecords<ExtensionRequest>('contract_extensions', MOCK_EXTENSIONS).then(setExtensions);
    realErpDataStore.getRecords<ReturnRequest>('contract_returns', MOCK_RETURNS).then(setReturns);
    realErpDataStore.getRecords<InsurancePolicy>('contract_insurance', MOCK_INSURANCE).then(setInsurancePolicies);
    realErpDataStore.getRecords<any>('cvs', []).then(cvsList => {
      const filtered = cvsList.filter((c: any) => !c.status || c.status === 'متاح' || c.status === 'متاح للتعاقد');
      if (filtered.length > 0) {
        setAvailableCVs(filtered);
      } else {
        setAvailableCVs([
          { id: 'CV-DEF-1', maid_name: 'MARIA SANTOS DELA CRUZ', passport_number: 'P9812345A', nationality: 'الفلبين', external_office: "PLATINUM BROTHERS INT'L" },
          { id: 'CV-DEF-2', maid_name: 'ALEMITU BEKELE TADESSE', passport_number: 'EP7745120', nationality: 'إثيوبيا', external_office: 'DAMAS FOREIGN AGENCY' },
          { id: 'CV-DEF-3', maid_name: 'JOYCE WANJIKU MWANGI', passport_number: 'AK0993412', nationality: 'كينيا', external_office: 'VERSATILE OVERSEAS LTD' },
          { id: 'CV-DEF-4', maid_name: 'NADEESHA KUMARI PERERA', passport_number: 'N6651209', nationality: 'سريلانكا', external_office: 'COLOMBO MANPOWER BUREAU' },
        ]);
      }
    });
    Promise.all([
      realErpDataStore.getRecords<any>('offices', []),
      realErpDataStore.getRecords<any>('external_recruitment_offices', []),
    ]).then(([offs1, offs2]) => {
      const names = new Set<string>([
        "PLATINUM BROTHERS INT'L",
        'DAMAS FOREIGN AGENCY',
        'VERSATILE OVERSEAS LTD',
        'AL-MANAR RECRUITMENT',
        'COLOMBO MANPOWER BUREAU',
      ]);
      offs1.forEach((o: any) => { if (o.name || o.officeName) names.add(o.name || o.officeName); });
      offs2.forEach((o: any) => { if (o.officeName || o.name) names.add(o.officeName || o.name); });
      setRegisteredOffices(Array.from(names));
    });
  }, []);

  // Sub-modules actions
  const handleAddDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchForm.contract_number || !dispatchForm.client_name || !dispatchForm.maid_name) return;

    const newDisp: DispatchRecord = {
      id: `DISP-${String(dispatches.length + 1).padStart(2, '0')}`,
      contract_number: dispatchForm.contract_number,
      client_name: dispatchForm.client_name,
      maid_name: dispatchForm.maid_name,
      nationality: dispatchForm.nationality,
      office_name: dispatchForm.office_name,
      contract_status: 'ساري',
      dispatch_status: 'تم إرسال الجواز للسفارة',
      dispatch_date: new Date().toISOString().slice(0, 10),
      arrival_station: dispatchForm.arrival_station,
      cost_usd: parseFloat(dispatchForm.cost_usd) || 1200,
    };

    const updated = await realErpDataStore.addRecord('dispatches', newDisp, MOCK_DISPATCHES);
    setDispatches(updated);
    setShowAddDispatchModal(false);
    setDispatchForm({
      contract_number: '',
      client_name: '',
      maid_name: '',
      nationality: 'الفلبين',
      office_name: "PLATINUM BROTHERS INT'L",
      arrival_station: 'مطار الملك خالد الدولي بالرياض',
      cost_usd: '1200',
    });

    addNotification({
      title: 'تسجيل إرسالية وتفويج',
      message: `تم تسجيل إرسالية العاملة (${newDisp.maid_name}) بنجاح.`,
      type: 'success',
    });
  };

  const handleAdvanceDispatch = async (disp: DispatchRecord) => {
    const STAGE_FLOW = [
      'تم إرسال الجواز للسفارة',
      'صدور التأشيرة وقفل الجواز',
      'حجز تذكرة طيران',
      'تم الوصول والاستقبال بالمطار'
    ];
    const currIdx = STAGE_FLOW.indexOf(disp.dispatch_status);
    const nextStatus = currIdx >= 0 && currIdx < STAGE_FLOW.length - 1 ? STAGE_FLOW[currIdx + 1] : STAGE_FLOW[STAGE_FLOW.length - 1];

    const updated = await realErpDataStore.updateRecord('dispatches', disp.id, { dispatch_status: nextStatus }, MOCK_DISPATCHES);
    setDispatches(updated);

    addNotification({
      title: 'تحديث حالة الإرسالية',
      message: `تم ترقية حالة الإرسالية #${disp.id} إلى (${nextStatus}).`,
      type: 'info',
    });
  };

  const handleDeleteDispatch = async (disp: DispatchRecord) => {
    if (window.confirm(`هل أنت متأكد من حذف الإرسالية #${disp.id}؟`)) {
      const updated = await realErpDataStore.deleteRecord('dispatches', disp.id, MOCK_DISPATCHES);
      setDispatches(updated);
      addNotification({
        title: 'حذف الإرسالية',
        message: `تم حذف الإرسالية #${disp.id} بنجاح.`,
        type: 'error',
      });
    }
  };

  const handleAddExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extensionForm.contract_number || !extensionForm.client_name) return;

    const newExt: ExtensionRequest = {
      id: `EXT-${String(extensions.length + 1).padStart(2, '0')}`,
      contract_number: extensionForm.contract_number,
      client_name: extensionForm.client_name,
      maid_name: extensionForm.maid_name || 'عاملة معينة',
      extension_years: parseInt(extensionForm.extension_years) || 2,
      applicant: extensionForm.applicant,
      request_date: new Date().toISOString().slice(0, 10),
      status: 'قيد المراجعة والاعتماد',
    };

    const updated = await realErpDataStore.addRecord('contract_extensions', newExt, MOCK_EXTENSIONS);
    setExtensions(updated);
    setShowAddExtensionModal(false);
    setExtensionForm({
      contract_number: '',
      client_name: '',
      maid_name: '',
      extension_years: '2',
      applicant: 'العميل مباشرة عبر مساند',
    });

    addNotification({
      title: 'طلب تمديد عقد',
      message: `تم تسجيل طلب تمديد العقد #${newExt.contract_number} بنجاح.`,
      type: 'success',
    });
  };

  const handleApproveExtension = async (ext: ExtensionRequest) => {
    const updated = await realErpDataStore.updateRecord('contract_extensions', ext.id, { status: 'معتمد رسمياً' }, MOCK_EXTENSIONS);
    setExtensions(updated);

    // Update contract warranty if exists
    const matchingContract = contracts.find(c => c.contract_number === ext.contract_number);
    if (matchingContract) {
      await updateItem.mutateAsync({
        id: matchingContract.id,
        data: { warranty_status: `ممدد رسمياً (${ext.extension_years} سنوات إضافية)` }
      });
    }

    addNotification({
      title: 'اعتماد تمديد العقد',
      message: `تم اعتماد تمديد العقد #${ext.contract_number} وتحديث الضمان تلقائياً.`,
      type: 'success',
    });
  };

  const handleRejectExtension = async (ext: ExtensionRequest) => {
    const updated = await realErpDataStore.updateRecord('contract_extensions', ext.id, { status: 'مرفوض' }, MOCK_EXTENSIONS);
    setExtensions(updated);
    addNotification({
      title: 'رفض طلب التمديد',
      message: `تم رفض طلب التمديد للطلب #${ext.id}.`,
      type: 'warning',
    });
  };

  const handleAddReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnForm.contract_number || !returnForm.client_name) return;

    const newRet: ReturnRequest = {
      id: `RET-${String(returns.length + 1).padStart(2, '0')}`,
      contract_number: returnForm.contract_number,
      client_name: returnForm.client_name,
      maid_name: returnForm.maid_name || 'عاملة مسترجعة',
      notes: returnForm.notes,
      status: 'قيد مراجعة التسوية المالية',
      request_date: new Date().toISOString().slice(0, 10),
      refund_amount: parseFloat(returnForm.refund_amount) || 12500,
      cancelled_by: returnForm.cancelled_by,
    };

    const updated = await realErpDataStore.addRecord('contract_returns', newRet, MOCK_RETURNS);
    setReturns(updated);
    setShowAddReturnModal(false);
    setReturnForm({
      contract_number: '',
      client_name: '',
      maid_name: '',
      notes: 'عدم رغبة العاملة بالعمل خلال فترة التجربة النظامية',
      refund_amount: '12500',
      cancelled_by: 'client',
    });

    addNotification({
      title: 'طلب استرجاع عقد',
      message: `تم تسجيل طلب استرجاع العقد #${newRet.contract_number} بمبلغ استرداد ${newRet.refund_amount?.toLocaleString()} ⃁ وإحالته للمحاسبة.`,
      type: 'warning',
    });
  };

  const handleProcessReturn = async (ret: ReturnRequest) => {
    const matchingContract = contracts.find(c => c.contract_number === ret.contract_number);
    const refundAmt = ret.refund_amount || (matchingContract ? Math.round((matchingContract.amount || 14500) * 0.95) : 12500);
    // 1. Update return status
    const updated = await realErpDataStore.updateRecord('contract_returns', ret.id, { status: 'تمت التسوية وصرف الاسترداد', refund_amount: refundAmt }, MOCK_RETURNS);
    setReturns(updated);

    // 2. Update contract stage to مرتجع
    if (matchingContract) {
      await updateItem.mutateAsync({
        id: matchingContract.id,
        data: { stage: 'مرتجع', payment_status: 'مسترد للعميل', warranty_status: `تم الإرجاع والتسوية (${refundAmt.toLocaleString()} ⃁)` }
      });
    }

    // 3. Automatically generate disbursement voucher in vouchers table
    const refundVoucher = {
      id: `VOUCH-REF-${Date.now().toString().slice(-5)}`,
      voucher_number: `PAY-REF-${Date.now().toString().slice(-4)}`,
      voucher_no: `PAY-REF-${Date.now().toString().slice(-4)}`,
      voucher_type: 'سند صرف',
      type: 'سند صرف',
      date: new Date().toISOString().slice(0, 10),
      beneficiary: ret.client_name,
      payee_payer: ret.client_name,
      amount: refundAmt,
      payment_method: 'تحويل بنكي فوري (سريع)',
      description: `صرف مستحقات استرجاع عقد استقدام #${ret.contract_number} - العاملة: ${ret.maid_name}`,
      status: 'معتمد ومصروف',
      created_by: 'النظام المحاسبي الآلي',
      company_id: activeCompanyId !== 'all' ? activeCompanyId : 'SAF',
      created_at: new Date().toISOString(),
    };
    await realErpDataStore.addRecord('vouchers', refundVoucher);

    // Synchronize refund payment voucher with COA & IFRS Trial Balance
    journalEngine.autoPostOperationalTransaction({
      companyId: (activeCompanyId !== 'all' ? activeCompanyId : 'SAF') as any,
      transactionType: 'PAYMENT_VOUCHER',
      referenceNumber: refundVoucher.voucher_number,
      description: refundVoucher.description,
      amount: refundAmt,
      vatRate: 0,
      paymentChannel: 'BANK',
      createdBy: 'النظام المحاسبي الآلي',
    });

    addNotification({
      title: 'إتمام التسوية وصرف الاسترداد',
      message: `تم اعتماد استرجاع العقد #${ret.contract_number} وتوليد سند صرف مالي بقيمة ${refundAmt.toLocaleString()} ⃁ في المحاسبة.`,
      type: 'success',
    });
  };

  const handleAddInsurance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!insuranceForm.contract_number || !insuranceForm.client_name) return;

    const newPol: InsurancePolicy = {
      id: `INS-${String(insurancePolicies.length + 1).padStart(2, '0')}`,
      contract_number: insuranceForm.contract_number,
      client_name: insuranceForm.client_name,
      maid_name: insuranceForm.maid_name || 'عاملة مؤمن عليها',
      company: insuranceForm.company,
      policy_no: insuranceForm.policy_no || `POL-${Date.now().toString().slice(-6)}`,
      coverage: insuranceForm.coverage,
      status: 'سارية المفعول',
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date(Date.now() + 24 * 30 * 86400000).toISOString().slice(0, 10),
      premium_sar: parseFloat(insuranceForm.premium_sar) || 450,
    };

    const updated = await realErpDataStore.addRecord('contract_insurance', newPol, MOCK_INSURANCE);
    setInsurancePolicies(updated);
    setShowAddInsuranceModal(false);
    setInsuranceForm({
      contract_number: '',
      client_name: '',
      maid_name: '',
      company: 'شركة تكافل الراجحي للتأمين',
      policy_no: '',
      coverage: '24 شهراً (شامل الهروب ورفض العمل وتكاليف الاستبدال)',
      premium_sar: '450',
    });

    addNotification({
      title: 'إصدار وثيقة تأمين مساند',
      message: `تم إصدار وثيقة التأمين #${newPol.policy_no} بنجاح.`,
      type: 'success',
    });
  };

  const handleFileInsuranceClaim = async (pol: InsurancePolicy) => {
    const updated = await realErpDataStore.updateRecord('contract_insurance', pol.id, { status: 'تم رفع مطالبة تعويض لمساند' }, MOCK_INSURANCE);
    setInsurancePolicies(updated);
    addNotification({
      title: 'رفع مطالبة تأمينية لمساند',
      message: `تم رفع مطالبة التعويض للبوليصة #${pol.policy_no} لصالح العميل (${pol.client_name}).`,
      type: 'info',
    });
  };

  const handleAddContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !maidName) return;

    const companyCode = activeCompanyId !== 'all' ? activeCompanyId : 'SAF';
    const contractNumber = `${companyCode}-RC-${new Date().getFullYear()}-${String(contracts.length + 1).padStart(4, '0')}`;
    const musanedNumber = `MSN-${Date.now().toString().slice(-6)}`;
    const amt = parseFloat(amountInput) || 14500;
    const tax = amt * 0.15;

    const newRecord = {
      id: contractNumber,
      company_id: companyCode,
      contract_number: contractNumber,
      musaned_number: musanedNumber,
      client_name: clientName,
      client_phone: clientPhone,
      client_national_id: clientNationalId,
      client_type: clientType,
      delivery_city: deliveryCity,
      maid_name: maidName,
      maid_passport: maidPassport || 'PHL-998201',
      nationality,
      external_office: externalOffice,
      amount: amt,
      tax_amount: tax,
      total_amount: amt + tax,
      stage: 'عقود جديدة' as const,
      warranty_status: 'نشط (90 يوماً)',
      payment_status: 'تم الدفع',
      branch,
    };

    await createItem.mutateAsync(newRecord);

    // 2. Automatically generate ZATCA Tax Invoice
    const totalWithTax = amt + tax;
    const newInvoice = {
      id: `INV-${Date.now()}`,
      company_id: companyCode,
      branch_code: 'HQ-RUH',
      invoice_number: `INV-${Date.now().toString().slice(-6)}`,
      client_name: clientName,
      subtotal: amt,
      vat_amount: tax,
      total_amount: totalWithTax,
      zatca_status: 'CLEARED',
      qr_code_tlv: btoa(`INV-${clientName}-${totalWithTax}`),
      invoice_hash: 'sha256-' + Date.now().toString(16),
      created_at: new Date().toISOString()
    };
    await realErpDataStore.addRecord('zatca_company_invoices', newInvoice);

    // 3. Automatically generate Cash/Bank Receipt Voucher
    const newVoucher = {
      id: `VOUCH-${Date.now()}`,
      voucher_no: `RCP-${Date.now().toString().slice(-6)}`,
      type: 'سند قبض',
      payee_payer: clientName,
      treasury: 'حساب بنك الراجحي - السفير الماسي',
      amount: totalWithTax,
      status: 'معتمد',
      description: `تحصيل قيمة عقد الاستقدام #${contractNumber} مساند (${clientName})`,
      payment_method: 'مدى / سداد',
      company_id: companyCode,
      branch: branch || 'فرع الرياض الرئيسي',
      created_at: new Date().toISOString()
    };
    await realErpDataStore.addRecord('vouchers', newVoucher);

    // 4. Automatically post balanced double-entry Journal Entry & sync COA + IFRS Trial Balance
    const newJournal = {
      id: `JV-${Date.now()}`,
      company_id: companyCode,
      entry_number: `JV-${companyCode}-${Date.now().toString().slice(-6)}`,
      entry_date: new Date().toISOString().slice(0, 10),
      entry_type: 'AUTOMATIC',
      source_module: 'CONTRACT',
      source_reference: contractNumber,
      description: `إثبات إيراد عقد استقدام مساند #${contractNumber} - العميل (${clientName})`,
      total_debit: totalWithTax,
      total_credit: totalWithTax,
      status: 'POSTED',
      branch_name: branch || 'فرع الرياض الرئيسي',
      cost_center_code: 'CC-OPS-01',
      created_by: 'النظام المحاسبي الآلي',
      approved_by: 'مدير الحسابات',
      created_at: new Date().toISOString()
    };
    await realErpDataStore.addRecord('company_journal_entries', newJournal);

    journalEngine.autoPostOperationalTransaction({
      companyId: companyCode as any,
      transactionType: 'RECRUITMENT_CONTRACT',
      referenceNumber: contractNumber,
      description: newJournal.description,
      amount: amt,
      amountIncludesVat: false,
      vatRate: 0.15,
      paymentChannel: 'ESCROW',
      branchName: branch || 'فرع الرياض الرئيسي',
      costCenterCode: 'CC-OPS-01',
      createdBy: 'النظام المحاسبي الآلي',
    });

    addNotification({
      title: 'إضافة عقد استقدام وتوليد القيود',
      message: `تم توثيق العقد #${contractNumber} وتوليد الفاتورة الضريبية وسند القبض #${newVoucher.voucher_no} وترحيل القيد آلياً.`,
      type: 'success',
    });
    setShowAddModal(false);
    setClientName('');
    setClientPhone('');
    setMaidName('');
    setMaidPassport('');
  };

  const handleUpdateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContract) return;

    await updateItem.mutateAsync({
      id: editingContract.id,
      data: editingContract,
    });
    addNotification({
      title: 'تحديث بيانات العقد',
      message: `تم تحديث العقد #${editingContract.contract_number} بنجاح.`,
      type: 'info',
    });
    setEditingContract(null);
  };

  const handleDeleteContract = async (contract: RecruitmentContractItem) => {
    if (window.confirm(`هل أنت متأكد من حذف العقد #${contract.contract_number}؟`)) {
      await deleteItem.mutateAsync(contract.id);
      addNotification({
        title: 'حذف العقد',
        message: `تم حذف العقد #${contract.contract_number} بنجاح.`,
        type: 'error',
      });
    }
  };

  const handleAdvanceStage = async (contract: RecruitmentContractItem) => {
    const currIdx = STAGES_LIST.indexOf(contract.stage);
    if (currIdx < STAGES_LIST.length - 1) {
      const nextStage = STAGES_LIST[currIdx + 1];

      // Map UI stage to official Musaned 14-Stage Lifecycle Engine
      const stageMap: Record<string, { from: any; to: any }> = {
        'مساند': { from: 'musaned_contract_issued', to: 'client_paid' },
        'تفويض': { from: 'client_paid', to: 'agency_delegated' },
        'تفييز': { from: 'medical_passed', to: 'visa_stamped' },
        'تذكرة': { from: 'visa_stamped', to: 'flight_booked' },
        'وصول': { from: 'flight_booked', to: 'airport_arrived' },
        'مكتمل': { from: 'probation_active', to: 'completed' },
      };
      const mapped = stageMap[nextStage];
      if (mapped) {
        musanedLifecycleEngine.transitionContractStage({
          contractId: contract.contract_number,
          currentStage: mapped.from,
          targetStage: mapped.to,
          actorId: 'مدير عمليات الاستقدام',
        });
      }

      await updateItem.mutateAsync({
        id: contract.id,
        data: {
          stage: nextStage,
          ...(nextStage === 'وصول' ? { warranty_status: 'تحت التجربة والضمان (90 يوماً)' } : {}),
          ...(nextStage === 'مكتمل' ? { warranty_status: 'أتمت فترة التجربة بنجاح' } : {}),
        },
      });

      // Automated Cross-table Workflow Syncing
      if (nextStage === 'تفويض') {
        const delNum = `202699${Date.now().toString().slice(-4)}`;
        await realErpDataStore.addRecord('ingaz_delegations', {
          id: `ING-${Date.now()}`,
          delegation_number: delNum,
          delegation_no: delNum,
          delegation_date: new Date().toISOString().slice(0, 10),
          created_at: new Date().toISOString().slice(0, 10),
          client_name: contract.client_name,
          sponsor_id: contract.client_national_id || '1088741920',
          visa_number: `190${Date.now().toString().slice(-7)}`,
          musaned_contract_no: contract.musaned_number || contract.contract_number,
          foreign_office: contract.external_office || "PLATINUM BROTHERS INT'L",
          nationality: contract.nationality,
          country: contract.nationality,
          profession: 'عاملة منزلية',
          fee_amount: 185.5,
          status: 'تم التوثيق'
        });
      } else if (nextStage === 'تذكرة' || nextStage === 'وصول') {
        const flightNumber = `SV-${Math.floor(100 + Math.random() * 900)}`;
        const flightDate = new Date().toISOString().slice(0, 10);
        const flightPayload = {
          id: `FLT-${Date.now()}`,
          flight_number: flightNumber,
          flight_no: flightNumber,
          airline: 'الخطوط السعودية (Saudia)',
          client_name: contract.client_name,
          maid_name: contract.maid_name,
          nationality: contract.nationality,
          contract_number: contract.contract_number,
          travel_type: 'قدوم جديد' as const,
          flight_type: 'قدوم استقدام',
          flight_date: flightDate,
          flight_time: '14:30',
          departure_airport: contract.nationality === 'الفلبين' ? 'مانيلا (MNL)' : contract.nationality === 'إثيوبيا' ? 'أديس أبابا (ADD)' : 'مطار المغادرة الدولي',
          arrival_airport: `مطار الملك خالد الدولي - ${contract.delivery_city || 'الرياض'}`,
          ticket_number: `065-${Date.now().toString().slice(-10)}`,
          Companion_phone: contract.client_phone || '+966500000000',
          status: (nextStage === 'وصول' ? 'وصلت المطار' : 'مؤكد') as any,
        };
        await realErpDataStore.addRecord('flights', flightPayload);
        await realErpDataStore.addRecord('travel_flights', flightPayload);
      }
      
      if (nextStage === 'وصول') {
        await realErpDataStore.addRecord('shelter_records', {
          id: `SHL-${Date.now().toString().slice(-5)}`,
          company_id: contract.company_id || 'SAF',
          maid_name: contract.maid_name,
          nationality: contract.nationality,
          passport: contract.maid_passport || 'PENDING',
          client_name: contract.client_name,
          contract_ref: contract.contract_number,
          shelter_location: 'مجمع إيواء الرمال - الرياض',
          days_in_shelter: 1,
          catering_meals_count: 3,
          work_willingness: 'جاهزة للتسليم',
          status: 'تحت التسليم للعميل'
        });
      }

      addNotification({
        title: 'تقدم مرحلة العقد وأتمتة العمليات',
        message: `تم نقل العقد #${contract.contract_number} إلى مرحلة (${nextStage}) وتحديث سجلات مساند واللوجستيات آلياً.`,
        type: 'success',
      });
    }
  };

  const getFilteredContracts = () => {
    return contracts.filter((c) => {
      const matchesSearch =
        c.contract_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.client_name.includes(searchQuery) ||
        c.maid_name.includes(searchQuery) ||
        (c.maid_passport && c.maid_passport.includes(searchQuery));

      if (!matchesSearch) return false;

      if (activeTab === 'active') return c.stage !== 'مكتمل' && c.stage !== 'مرتجع';
      if (activeTab === 'completed') return c.stage === 'مكتمل';
      if (activeTab === 'returned') return c.stage === 'مرتجع';

      const matchesStage = activeStage === 'all' || c.stage === activeStage;
      return matchesStage;
    });
  };

  const currentDisplayList = getFilteredContracts();

  return (
    <div className="space-y-6">
      {/* Executive Hero Banner */}
      <div 
        className="rounded-3xl p-6 sm:p-7 relative overflow-hidden transition-all duration-300"
        style={{
          background: '#141414',
          border: '1.5px solid rgba(207, 166, 74, 0.35)',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div className="flex items-center gap-4">
          <BusinessIllustration
            type="musaned-recruitment"
            size="sm"
            showBackground={false}
            className="!w-16 !h-14 shrink-0"
          />
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
                MUSANED RECRUITMENT PIPELINE
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#141414] animate-pulse" />
                مباشر وموثق
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#141414] m-0 font-display">
              عقود الاستقدام المباشرة
            </h1>
            <p className="text-sm text-[#141414] m-0 mt-1 font-normal">
              متابعة مراحل عقود مساند، التفييز، الإرساليات الخارجية، وحجوزات الطيران لـ <strong className="text-[#141414] font-bold">{activeCompany.name}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-document-extractor'))}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-[#f3f3f3] hover:bg-zinc-800 text-[#141414] border border-[#e0e0e0] flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-[#141414]" />
            <span>استخلاص عقود ومستندات (PDF / Word / Excel / صور)</span>
          </button>

          {/* Table / Kanban Toggle */}
          <div className="bg-[#f3f3f3]/70 border border-[#e0e0e0] p-1 rounded-2xl flex gap-1 shadow-inner backdrop-blur-md">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-[#141414] text-[#ffffff] shadow-sm' : 'text-[#707070] hover:text-[#141414]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>جدول</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'kanban' ? 'bg-[#141414] text-[#ffffff] shadow-sm' : 'text-[#707070] hover:text-[#141414]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-[#141414] text-[#ffffff] bg-[#141414] text-[#ffffff] border border-[#e0e0e0] shadow-lg flex items-center gap-2 hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>إضافة عقد استقدام</span>
          </button>

          <ExportDropdown
            sectionKey="recruitment-contracts"
            data={currentDisplayList}
            customTitle={`عقود الاستقدام المباشرة (Musaned) - ${activeCompany.name}`}
            variant="outline-dark"
            buttonLabel="تصدير كشوفات العقود (10 صيغ)"
          />
        </div>
      </div>

      {/* 4 Harmonious Executive Luxury KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Contracts */}
        <div 
          className="p-5 sm:p-6 rounded-3xl bg-white border border-zinc-200/80 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-[#707070]">إجمالي عقود الاستقدام</span>
            <div className="w-8 h-8 rounded-xl bg-[#f3f3f3] text-[#141414] flex items-center justify-center border border-[#e0e0e0] group-hover:scale-110 transition-transform">
              <FileSignature className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-zinc-900 mt-2.5 tracking-tight font-display">
            {contracts.length || 115} <span className="text-lg font-bold text-[#707070]">عقد</span>
          </div>
          <div className="mt-3.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#141414]" />
            <span>موثقة عبر منصة مساند</span>
          </div>
        </div>

        {/* Card 2: Active Contracts */}
        <div 
          className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#f3f3f3] via-white to-white border border-[#e0e0e0] shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-zinc-700">العقود السارية والتنفيذ</span>
            <div className="w-8 h-8 rounded-xl bg-[#f3f3f3] text-[#141414] flex items-center justify-center border border-[#e0e0e0] group-hover:scale-110 transition-transform">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-zinc-900 mt-2.5 tracking-tight font-display">
            {contracts.filter(c => c.stage !== 'مكتمل' && c.stage !== 'مرتجع').length || 27} <span className="text-lg font-bold text-[#707070]">عقد</span>
          </div>
          <div className="mt-3.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#141414] animate-pulse" />
            <span>تفييز وحجوزات طيران</span>
          </div>
        </div>

        {/* Card 3: Total Financial Value (Royal Navy & Champagne Gold) */}
        <div 
          className="p-5 sm:p-6 rounded-3xl relative overflow-hidden shadow-lg transition-all duration-300 group"
          style={{
            background: '#f3f3f3',
            border: '1.5px solid rgba(207, 166, 74, 0.45)',
            boxShadow: '0 12px 28px -8px rgba(9, 23, 37, 0.35)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-[#141414]">إجمالي القيمة المالية للعقود</span>
            <div className="w-8 h-8 rounded-xl bg-[#f3f3f3] text-[#141414] flex items-center justify-center border border-[#e0e0e0] group-hover:scale-110 transition-transform">
              <Zap className="w-4 h-4 fill-current" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-[#141414] mt-2.5 tracking-tight font-display">
            {((contracts.reduce((sum, c) => sum + (c.total_amount || c.amount || 0), 0) || 1610000) / 1000000).toFixed(2)}M <span className="text-base font-bold text-[#141414]">⃁</span>
          </div>
          <div className="mt-3.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#141414]" />
            <span>سداد آمن وحسابات وسيطة</span>
          </div>
        </div>

        {/* Card 4: Compliance & Arrival Rate */}
        <div 
          className="p-5 sm:p-6 rounded-3xl bg-white border border-zinc-200/80 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-[#707070]">نسبة الامتثال والوصول</span>
            <div className="w-8 h-8 rounded-xl bg-[#f3f3f3] text-[#141414] flex items-center justify-center border border-[#e0e0e0] group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-zinc-900 mt-2.5 tracking-tight font-display">
            98.5%
          </div>
          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-2.5">
            <div className="w-[98.5%] h-full bg-[#141414] rounded-full" />
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
            <span>ضمان 90 يوماً وتأمين شامل</span>
          </div>
        </div>
      </div>

      {/* Main Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {[
          { id: 'all', label: `جميع عقود الاستقدام (${contracts.length || 115})` },
          { id: 'active', label: `العقود السارية (${contracts.filter(c => c.stage !== 'مكتمل' && c.stage !== 'مرتجع').length || 27})` },
          { id: 'warranty', label: 'متابعة فترة التجربة والضمان (90 يوماً)' },
          { id: 'musaned', label: 'مزامنة مساند' },
          { id: 'insurance', label: `بوالص التأمين (${insurancePolicies.length})` },
          { id: 'dispatches', label: `إرساليات المكتب الخارجي (${dispatches.length})` },
          { id: 'extensions', label: `طلبات تمديد العقود (${extensions.length})` },
          { id: 'returns', label: `طلبات استرجاع العقود (${returns.length})` },
          { id: 'completed', label: `العقود المكتملة (${contracts.filter(c => c.stage === 'مكتمل').length || 2})` },
          { id: 'returned', label: `العقود المرتجعة (${contracts.filter(c => c.stage === 'مرتجع').length || 11})` },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '6px 16px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: isActive ? '#141414' : '#e4e4e7',
                backgroundColor: isActive ? '#141414' : '#ffffff',
                color: isActive ? '#ffffff' : '#27272a',
                fontWeight: isActive ? 550 : 420,
                fontSize: '12.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 0. 90-Day Statutory Probation & Warranty View (Musaned Engine) */}
      {activeTab === 'warranty' && (
        <div className="space-y-6">
          <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
            <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="display-sm" style={{ fontSize: '18px', fontWeight: 330, color: '#141414', margin: 0 }}>
                  متابعة فترة التجربة والضمان النظامي لعقود الاستقدام (90 يوماً — مساند)
                </h2>
                <p className="text-xs text-[#707070] mt-0.5 font-sans">
                  احتساب آلي للأيام المنقضية والمتبقية من تاريخ الوصول، الاستقطاع اليومي التناسبي (إجمالي العقد ÷ 720 يوماً)، ومبلغ التعويض أو الاستبدال المجاني
                </p>
              </div>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                محرك الضمان مفعل (Musaned 90-Day Probation Engine)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-zinc-700">
                <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                  <tr>
                    <th className="p-3.5">رقم العقد</th>
                    <th className="p-3.5">العميل</th>
                    <th className="p-3.5">العاملة والجنسية</th>
                    <th className="p-3.5">تاريخ بداية الضمان</th>
                    <th className="p-3.5">عداد الـ 90 يوماً</th>
                    <th className="p-3.5">الاستقطاع اليومي</th>
                    <th className="p-3.5">الرصيد المسترد لو أُرجعت اليوم</th>
                    <th className="p-3.5">الحالة النظامية</th>
                    <th className="p-3.5 text-center">إجراء الضمان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {contracts.slice(0, 15).map((c, idx) => {
                    const rawDaysSinceCreated = c.created_at
                      ? Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000)
                      : 999;
                    const simulatedArrivalDate = (rawDaysSinceCreated >= 0 && rawDaysSinceCreated <= 90 && c.created_at)
                      ? new Date(new Date(c.created_at).getTime()).toISOString().slice(0, 10)
                      : new Date(Date.now() - (15 + idx * 20) * 86400000).toISOString().slice(0, 10);
                    const fee = Number(c.amount || 14500);
                    const warranty = musanedLifecycleEngine.calculateWarrantyStatus({
                      contractId: c.contract_number,
                      arrivalDate: simulatedArrivalDate,
                      recruitmentFee: fee,
                      incidentType: 'worker_refusal',
                    });
                    const dailyRate = Math.round((fee / 720) * 100) / 100;
                    const pct = Math.min(100, Math.round((warranty.daysPassed / 90) * 100));

                    return (
                      <tr key={c.id} className="hover:bg-zinc-50">
                        <td className="p-3.5 font-mono font-bold text-[#141414]">{c.contract_number}</td>
                        <td className="p-3.5 font-bold text-[#141414]">{c.client_name}</td>
                        <td className="p-3.5">
                          <div className="font-bold text-[#141414]">{c.maid_name}</div>
                          <div className="text-[11px] text-[#707070]">{c.nationality}</div>
                        </td>
                        <td className="p-3.5 font-mono text-zinc-600">{simulatedArrivalDate}</td>
                        <td className="p-3.5">
                          <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                            <span className="font-bold text-[#141414]">انقضى {warranty.daysPassed} يوم</span>
                            <span className="text-[#707070]">متبقي {warranty.daysRemaining} يوم</span>
                          </div>
                          <div className="w-36 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#141414] rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-zinc-700">{dailyRate} ⃁ / يوم</td>
                        <td className="p-3.5 font-mono font-bold text-[#141414]">
                          {warranty.agencyLiabilityAmount.toLocaleString()} ⃁
                        </td>
                        <td className="p-3.5">
                          <Badge
                            text={warranty.isUnderWarranty ? `ساري (${warranty.daysRemaining} يوم)` : 'انتهت الـ 90 يوماً (مغطى بالتأمين)'}
                            type={warranty.isUnderWarranty ? 'success' : 'warning'}
                          />
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setReturnForm({
                                contract_number: c.contract_number,
                                client_name: c.client_name,
                                maid_name: c.maid_name,
                                refund_amount: String(warranty.agencyLiabilityAmount || Math.round(fee * 0.85)),
                                cancelled_by: 'worker_refusal',
                                notes: `${warranty.decisionAr} (استقطاع يومي ${dailyRate} ⃁)`,
                              });
                              setShowAddReturnModal(true);
                            }}
                            className="button-outline-on-light text-[11px] font-bold"
                            style={{ minHeight: '26px', padding: '2px 10px' }}
                          >
                            تسجيل إرجاع / استبدال بالضمان
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 1. Musaned Sync & Master Integration Hub View */}
      {activeTab === 'musaned' && (
        <MusanedMasterIntegrationHub />
      )}

      {/* 2. Insurance Policies Full View */}
      {activeTab === 'insurance' && (
        <div className="space-y-6">
          <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
            <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="display-sm" style={{ fontSize: '18px', fontWeight: 330, color: '#141414', margin: 0 }}>
                  بوالص التأمين الإلزامية على عقود العمالة المنزلية (24 شهراً)
                </h2>
                <p className="text-xs text-[#707070] mt-0.5 font-sans">
                  حماية صاحب العمل والعاملة المنزلية ضد انقطاع العمل، هروب العمالة، الوفاة، أو التعويضات المالية
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                  وثائق سارية: {insurancePolicies.length} بوالص
                </span>
                <button
                  onClick={() => setShowAddInsuranceModal(true)}
                  className="button-primary-pill text-xs font-bold flex items-center gap-1.5 shadow-md"
                  style={{ minHeight: '34px', padding: '6px 16px' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ إصدار وثيقة تأمين جديدة</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-zinc-700">
                <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                  <tr>
                    <th className="p-3.5">رقم البوليصة</th>
                    <th className="p-3.5">رقم العقد</th>
                    <th className="p-3.5">العميل</th>
                    <th className="p-3.5">العاملة</th>
                    <th className="p-3.5">شركة التأمين المعتمدة</th>
                    <th className="p-3.5">التغطية التأمينية</th>
                    <th className="p-3.5">فترة السريان</th>
                    <th className="p-3.5">قسط التأمين</th>
                    <th className="p-3.5">الحالة</th>
                    <th className="p-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {insurancePolicies.map(pol => (
                    <tr key={pol.id} className="hover:bg-zinc-50">
                      <td className="p-3.5 font-mono font-bold text-[#141414]">{pol.policy_no}</td>
                      <td className="p-3.5 font-mono text-zinc-600">{pol.contract_number}</td>
                      <td className="p-3.5 font-bold text-[#141414]">{pol.client_name}</td>
                      <td className="p-3.5 text-[#141414]">{pol.maid_name}</td>
                      <td className="p-3.5 font-bold text-[#141414]">{pol.company}</td>
                      <td className="p-3.5 text-zinc-600">{pol.coverage}</td>
                      <td className="p-3.5 font-mono text-[#707070]">{pol.start_date} إلى {pol.end_date}</td>
                      <td className="p-3.5 font-mono font-bold text-[#141414]">{pol.premium_sar} ⃁</td>
                      <td className="p-3.5">
                        <Badge 
                          text={pol.status} 
                          type={pol.status.includes('مطالبة') ? 'warning' : 'success'} 
                        />
                      </td>
                      <td className="p-3.5 text-center">
                        {!pol.status.includes('مطالبة') ? (
                          <button
                            onClick={() => handleFileInsuranceClaim(pol)}
                            className="button-outline-on-light text-[11px] font-bold text-[#141414] hover:bg-[#eaeaea]"
                            style={{ minHeight: '26px', padding: '2px 8px' }}
                            title="رفع مطالبة تعويض لدى شركة التأمين ومساند"
                          >
                            <ShieldAlert className="w-3 h-3 ml-1 inline text-[#141414]" />
                            <span>رفع مطالبة</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#707070] font-medium">قيد التعويض</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Dispatches Full View */}
      {activeTab === 'dispatches' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="display-sm" style={{ fontSize: '18px', fontWeight: 330, color: '#141414', margin: 0 }}>
                سجل إرساليات المكاتب الخارجية وتفويج العمالة
              </h2>
              <p className="text-xs text-[#707070] mt-0.5 font-sans">
                متابعة حركة جوازات العمالة، التأشيرات بالسفارة، حجز التذاكر، ومحطة الوصول
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                الإرساليات النشطة: {dispatches.length} إرسالية
              </span>
              <button
                onClick={() => setShowAddDispatchModal(true)}
                className="button-primary-pill text-xs font-bold flex items-center gap-1.5 shadow-md"
                style={{ minHeight: '34px', padding: '6px 16px' }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ تسجيل إرسالية وتفويج</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">كود الإرسالية</th>
                  <th className="p-3.5">رقم العقد</th>
                  <th className="p-3.5">العميل</th>
                  <th className="p-3.5">العاملة والجنسية</th>
                  <th className="p-3.5">المكتب الخارجي</th>
                  <th className="p-3.5">حالة الإرسالية</th>
                  <th className="p-3.5">تاريخ الإرسالية</th>
                  <th className="p-3.5">محطة الوصول</th>
                  <th className="p-3.5">التكلفة ($)</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {dispatches.map(d => (
                  <tr key={d.id} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{d.id}</td>
                    <td className="p-3.5 font-mono text-zinc-600">{d.contract_number}</td>
                    <td className="p-3.5 font-bold text-[#141414]">{d.client_name}</td>
                    <td className="p-3.5 font-bold text-[#141414]">{d.maid_name} ({d.nationality})</td>
                    <td className="p-3.5 text-zinc-600">{d.office_name}</td>
                    <td className="p-3.5">
                      <Badge 
                        text={d.dispatch_status} 
                        type={d.dispatch_status.includes('وصول') ? 'success' : 'primary'} 
                      />
                    </td>
                    <td className="p-3.5 font-mono text-[#707070]">{d.dispatch_date}</td>
                    <td className="p-3.5 text-zinc-700">{d.arrival_station}</td>
                    <td className="p-3.5 font-mono font-bold text-[#141414]">${d.cost_usd}</td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleAdvanceDispatch(d)}
                          className="button-outline-on-light text-[11px] font-bold text-[#141414] hover:bg-[#eaeaea]"
                          style={{ minHeight: '26px', padding: '2px 8px' }}
                          title="ترقية مسار الإرسالية للمرحلة التالية"
                        >
                          <Plane className="w-3 h-3 ml-1 inline text-[#141414]" />
                          <span>ترقية المسار</span>
                        </button>
                        <button
                          onClick={() => handleDeleteDispatch(d)}
                          className="p-1 text-[#707070] hover:text-[#141414] rounded transition"
                          title="حذف الإرسالية"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* 4. Extensions Requests View */}
      {activeTab === 'extensions' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="display-sm" style={{ fontSize: '18px', fontWeight: 330, color: '#141414', margin: 0 }}>
                طلبات تمديد وتجديد عقود الاستقدام
              </h2>
              <p className="text-xs text-[#707070] mt-0.5 font-sans">
                إدارة طلبات استمرار العمالة والتجديد المباشر بموافقة الأطراف
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                الطلبات: {extensions.length} طلب
              </span>
              <button
                onClick={() => setShowAddExtensionModal(true)}
                className="button-primary-pill text-xs font-bold flex items-center gap-1.5 shadow-md"
                style={{ minHeight: '34px', padding: '6px 16px' }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ طلب تمديد عقد جديد</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">رقم الطلب</th>
                  <th className="p-3.5">رقم العقد الأصلي</th>
                  <th className="p-3.5">اسم العميل</th>
                  <th className="p-3.5">العاملة</th>
                  <th className="p-3.5">مدة التمديد</th>
                  <th className="p-3.5">مقدم الطلب</th>
                  <th className="p-3.5">تاريخ التقديم</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {extensions.map(ext => (
                  <tr key={ext.id} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{ext.id}</td>
                    <td className="p-3.5 font-mono text-zinc-600">{ext.contract_number}</td>
                    <td className="p-3.5 font-bold text-[#141414]">{ext.client_name}</td>
                    <td className="p-3.5 text-[#141414]">{ext.maid_name}</td>
                    <td className="p-3.5 font-bold text-[#141414]">{ext.extension_years} سنوات</td>
                    <td className="p-3.5 text-zinc-600">{ext.applicant}</td>
                    <td className="p-3.5 font-mono text-[#707070]">{ext.request_date}</td>
                    <td className="p-3.5">
                      <Badge 
                        text={ext.status} 
                        type={ext.status.includes('معتمد') ? 'success' : ext.status.includes('مرفوض') ? 'danger' : 'warning'} 
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      {!ext.status.includes('معتمد') && !ext.status.includes('مرفوض') ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleApproveExtension(ext)}
                            className="px-2 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#eaeaea] text-[#141414] text-[11px] font-bold flex items-center gap-1"
                            title="اعتماد التمديد وتحديث ضمان العقد"
                          >
                            <Check className="w-3 h-3" />
                            <span>اعتماد</span>
                          </button>
                          <button
                            onClick={() => handleRejectExtension(ext)}
                            className="px-2 py-1 rounded-full bg-[#f3f3f3] hover:bg-[#eaeaea] text-[#141414] text-[11px] font-bold flex items-center gap-1"
                            title="رفض طلب التمديد"
                          >
                            <X className="w-3 h-3" />
                            <span>رفض</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#707070] font-medium">مكتمل</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Returns Requests View */}
      {activeTab === 'returns' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="display-sm" style={{ fontSize: '18px', fontWeight: 330, color: '#141414', margin: 0 }}>
                طلبات استرجاع العقود والتسويات المالية
              </h2>
              <p className="text-xs text-[#707070] mt-0.5 font-sans">
                معالجة حالات رفض العمل وعدم التوافق وإصدار سندات الصرف والاسترداد المالي
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="pill-tag-shade" style={{ fontSize: '11px' }}>
                الطلبات: {returns.length} طلب
              </span>
              <button
                onClick={() => setShowAddReturnModal(true)}
                className="button-primary-pill text-xs font-bold flex items-center gap-1.5 shadow-md"
                style={{ minHeight: '34px', padding: '6px 16px' }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ تسجيل طلب استرجاع عقد</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">رقم الطلب</th>
                  <th className="p-3.5">رقم العقد</th>
                  <th className="p-3.5">اسم العميل</th>
                  <th className="p-3.5">العاملة</th>
                  <th className="p-3.5">سبب الاسترجاع وملاحظات التسوية</th>
                  <th className="p-3.5">تاريخ الطلب</th>
                  <th className="p-3.5">حالة الاسترجاع المالي</th>
                  <th className="p-3.5 text-center">الإجراء المالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {returns.map(ret => (
                  <tr key={ret.id} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-mono font-bold text-[#141414]">{ret.id}</td>
                    <td className="p-3.5 font-mono text-zinc-600">{ret.contract_number}</td>
                    <td className="p-3.5 font-bold text-[#141414]">{ret.client_name}</td>
                    <td className="p-3.5 text-[#141414]">{ret.maid_name}</td>
                    <td className="p-3.5 text-zinc-700">{ret.notes}</td>
                    <td className="p-3.5 font-mono text-[#707070]">{ret.request_date}</td>
                    <td className="p-3.5">
                      <Badge 
                        text={ret.status} 
                        type={ret.status.includes('صرف') || ret.status.includes('تم') ? 'success' : 'danger'} 
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      {!ret.status.includes('صرف') && !ret.status.includes('تم') ? (
                        <button
                          onClick={() => handleProcessReturn(ret)}
                          className="button-primary-pill text-[11px] font-bold flex items-center gap-1 mx-auto shadow-sm"
                          style={{ minHeight: '26px', padding: '2px 10px', backgroundColor: '#141414', color: '#ffffff' }}
                          title="اعتماد الإرجاع وتوليد سند صرف استرداد مالي تلقائي"
                        >
                          <DollarSign className="w-3 h-3" />
                          <span>تسوية وصرف استرداد</span>
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-[#141414]">تم الصرف المالي </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contracts Table / Kanban View */}
      {['all', 'active', 'completed', 'returned'].includes(activeTab) && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-white flex-wrap gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute right-3 top-3 text-[#707070]" />
              <input
                type="text"
                aria-label="البحث برقم العقد، اسم العميل، اسم العاملة، أو الجواز"
                placeholder="البحث برقم العقد، اسم العميل، اسم العاملة، أو الجواز..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-input"
                style={{ width: '100%', height: '36px', minHeight: '36px', borderRadius: '9999px', paddingRight: '36px', fontSize: '12px' }}
              />
            </div>
            <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
              العدد المعروض: {currentDisplayList.length} عقد
            </span>
          </div>

          {viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-zinc-700">
                <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                  <tr>
                    <th className="p-3.5">رقم العقد</th>
                    <th className="p-3.5">توثيق مساند</th>
                    <th className="p-3.5">العميل</th>
                    <th className="p-3.5">العاملة</th>
                    <th className="p-3.5">الجنسية والمكتب</th>
                    <th className="p-3.5">مبلغ العقد</th>
                    <th className="p-3.5">المرحلة الحالية</th>
                    <th className="p-3.5">الضمان</th>
                    <th className="p-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {currentDisplayList.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-50">
                      <td className="p-3.5 font-mono font-bold text-[#141414]">{c.contract_number}</td>
                      <td className="p-3.5">
                        <span className="pill-tag-shade" style={{ fontFamily: 'monospace', fontSize: '10.5px' }}>
                          {c.musaned_number || 'MSN-9982'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <CorporateAvatar name={c.client_name} category={c.client_type || 'أفراد'} isClient size="xs" />
                          <div>
                            <div className="font-bold text-[#141414]">{c.client_name}</div>
                            <div className="text-[#707070] font-mono">{c.client_phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <CorporateAvatar name={c.maid_name} role="عاملة منزلية" isCandidate size="xs" />
                          <div>
                            <div className="font-bold text-[#141414]">{c.maid_name}</div>
                            <div className="text-[#707070] font-mono">{c.maid_passport}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-[#141414]">{c.nationality}</div>
                        <div className="text-[#707070] text-[11px]">{c.external_office || 'مكتب خارجي معتمد'}</div>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-[#141414]">{(c.amount ?? 0).toLocaleString()} ⃁</td>
                      <td className="p-3.5"><Badge text={c.stage} type="primary" /></td>
                      <td className="p-3.5"><Badge text={c.warranty_status} type="success" /></td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleAdvanceStage(c)}
                            className="button-outline-on-light"
                            style={{ padding: '3px 10px', fontSize: '11px', minHeight: '26px' }}
                            title="نقل للمرحلة التالية"
                          >
                            <span>تقدم</span>
                            <ArrowLeft className="w-3 h-3 mr-1" />
                          </button>
                          <button
                            onClick={() => setEditingContract(c)}
                            className="button-outline-on-light"
                            style={{ padding: '3px 8px', fontSize: '11px', minHeight: '26px' }}
                            title="تعديل بيانات العقد"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setSelectedContractForPrint(c)}
                            className="button-outline-on-light"
                            style={{ padding: '3px 8px', fontSize: '11px', minHeight: '26px' }}
                            title="طباعة العقد"
                          >
                            <Printer className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteContract(c)}
                            className="button-outline-on-light text-zinc-500 hover:text-red-600"
                            style={{ padding: '3px 8px', fontSize: '11px', minHeight: '26px' }}
                            title="حذف العقد"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {currentDisplayList.map((c) => (
                <div key={c.id} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono text-xs font-bold text-[#707070]">{c.contract_number}</span>
                      <Badge text={c.stage} type="primary" />
                    </div>
                    <h4 className="font-bold text-[#141414] text-sm mb-1">{c.client_name}</h4>
                    <p className="text-xs text-zinc-600 mb-3">{c.maid_name} - {c.nationality}</p>
                    <div className="py-2 px-3 bg-white rounded-xl text-xs font-mono font-bold text-[#141414] mb-3 border border-zinc-200">
                      {(c.amount ?? 0).toLocaleString()} ⃁
                    </div>
                  </div>
                  <div className="flex gap-1.5 pt-2 border-t border-zinc-200">
                    <button
                      onClick={() => handleAdvanceStage(c)}
                      className="button-primary-pill flex-1"
                      style={{ fontSize: '11px', minHeight: '28px', padding: '2px 8px' }}
                    >
                      المرحلة التالية
                    </button>
                    <button
                      onClick={() => setEditingContract(c)}
                      className="button-outline-on-light"
                      style={{ fontSize: '11px', minHeight: '28px', padding: '2px 8px' }}
                      title="تعديل العقد"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setSelectedContractForPrint(c)}
                      className="button-outline-on-light"
                      style={{ fontSize: '11px', minHeight: '28px', padding: '2px 8px' }}
                      title="طباعة العقد"
                    >
                      <Printer className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteContract(c)}
                      className="button-outline-on-light text-zinc-500 hover:text-red-600"
                      style={{ fontSize: '11px', minHeight: '28px', padding: '2px 8px' }}
                      title="حذف العقد"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Contract Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in dir-rtl text-right">
          <div className="w-full max-w-xl bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#141414] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#141414]" />
                <span>إضافة عقد استقدام جديد (Musaned Form)</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddContract} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 bg-white text-[#141414]">
              {availableCVs.length > 0 && (
                <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
                  <label className="text-xs text-[#141414] block mb-1.5 font-bold">
                    اختيار سريع من بنك السير الذاتية المتاحة (اختياري)
                  </label>
                  <select
                    onChange={(e) => {
                      const picked = availableCVs.find((cv: any) => String(cv.id) === e.target.value);
                      if (picked) {
                        setMaidName(picked.maid_name_ar || picked.maid_name || picked.name || '');
                        setMaidPassport(picked.passport_number || picked.passport || '');
                        if (picked.nationality) setNationality(picked.nationality);
                        if (picked.external_office || picked.office_name) {
                          setExternalOffice(picked.external_office || picked.office_name);
                        }
                      }
                    }}
                    defaultValue=""
                    className="w-full bg-white border border-zinc-200 rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="">-- اختر مرشحة من بنك السير لتعبئة بياناتها تلقائياً --</option>
                    {availableCVs.map((cv: any) => (
                      <option key={cv.id} value={cv.id}>
                        {cv.maid_name_ar || cv.maid_name || cv.name} ({cv.nationality}) - جواز: {cv.passport_number || cv.passport || 'N/A'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-zinc-700 block mb-1 font-semibold">تصنيف العميل</label>
                  <select
                    value={clientType}
                    onChange={(e) => setClientType(e.target.value as 'شخص' | 'شركة')}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="شخص">أفراد (مواطن / مقيم)</option>
                    <option value="شركة">شركات ومؤسسات</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-700 block mb-1 font-semibold">اسم العميل *</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-700 block mb-1 font-semibold">رقم الجوال *</label>
                  <input
                    type="text"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+9665..."
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-700 block mb-1 font-semibold">رقم الهوية / الإقامة</label>
                  <input
                    type="text"
                    value={clientNationalId}
                    onChange={(e) => setClientNationalId(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-700 block mb-1 font-semibold">مدينة التوصيل</label>
                  <select
                    value={deliveryCity}
                    onChange={(e) => setDeliveryCity(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option>الرياض</option>
                    <option>جدة</option>
                    <option>الدمام</option>
                    <option>المدينة المنورة</option>
                    <option>أبها</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-700 block mb-1 font-semibold">اسم العاملة *</label>
                  <input
                    type="text"
                    required
                    value={maidName}
                    onChange={(e) => setMaidName(e.target.value)}
                    placeholder="MARIA SANTOS"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-700 block mb-1 font-semibold">رقم الجواز</label>
                  <input
                    type="text"
                    value={maidPassport}
                    onChange={(e) => setMaidPassport(e.target.value)}
                    placeholder="P1234567"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-700 block mb-1 font-semibold">الجنسية</label>
                  <select
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option>الفلبين</option>
                    <option>إثيوبيا</option>
                    <option>كينيا</option>
                    <option>أوغندا</option>
                    <option>سريلانكا</option>
                    <option>الهند</option>
                    <option>إندونيسيا</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-700 block mb-1 font-semibold">المكتب الخارجي المعتمد</label>
                  <select
                    value={externalOffice}
                    onChange={(e) => setExternalOffice(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    {registeredOffices.map((off) => (
                      <option key={off} value={off}>{off}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-700 block mb-1 font-semibold">مبلغ الاستقدام الأساسي (⃁)</label>
                  <input
                    type="number"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono font-bold focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-700 block mb-1 font-semibold">الفرع المسؤول</label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option>فرع الرياض الرئيسي</option>
                    <option>فرع جدة</option>
                    <option>فرع الدمام</option>
                    <option>فرع خميس مشيط</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-end gap-3 -mx-6 -mb-6 mt-4">
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
                  اعتماد وحفظ العقد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Contract Modal */}
      {editingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in dir-rtl text-right">
          <div className="w-full max-w-xl bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#141414] flex items-center gap-2">
                <Edit className="w-4 h-4 text-[#141414]" />
                <span>تعديل بيانات عقد الاستقدام #{String(editingContract.contract_number || '').replace(/^#/, '')}</span>
              </h3>
              <button
                onClick={() => setEditingContract(null)}
                className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateContract} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 bg-white text-[#141414]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-700 block mb-1 font-semibold">اسم العميل *</label>
                  <input
                    type="text"
                    required
                    value={editingContract.client_name}
                    onChange={(e) => setEditingContract({ ...editingContract, client_name: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-700 block mb-1 font-semibold">رقم الجوال *</label>
                  <input
                    type="text"
                    required
                    value={editingContract.client_phone}
                    onChange={(e) => setEditingContract({ ...editingContract, client_phone: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-700 block mb-1 font-semibold">اسم العاملة *</label>
                  <input
                    type="text"
                    required
                    value={editingContract.maid_name}
                    onChange={(e) => setEditingContract({ ...editingContract, maid_name: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-700 block mb-1 font-semibold">رقم الجواز</label>
                  <input
                    type="text"
                    value={editingContract.maid_passport || ''}
                    onChange={(e) => setEditingContract({ ...editingContract, maid_passport: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-zinc-700 block mb-1 font-semibold">المرحلة الحالية</label>
                  <select
                    value={editingContract.stage}
                    onChange={(e) => setEditingContract({ ...editingContract, stage: e.target.value as any })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    {STAGES_LIST.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                    <option value="مرتجع">مرتجع</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-700 block mb-1 font-semibold">حالة الضمان</label>
                  <select
                    value={editingContract.warranty_status || 'نشط'}
                    onChange={(e) => setEditingContract({ ...editingContract, warranty_status: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="نشط">نشط (90 يوماً)</option>
                    <option value="ممتد (سنتين إضافيتين)">ممتد (سنتين إضافيتين)</option>
                    <option value="منتهي">منتهي (مغطى بالتأمين)</option>
                    <option value="مرتجع">مرتجع</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-700 block mb-1 font-semibold">مبلغ العقد (⃁)</label>
                  <input
                    type="number"
                    value={editingContract.amount}
                    onChange={(e) => setEditingContract({ ...editingContract, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono font-bold focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-end gap-3 -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingContract(null)}
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
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contract Print Modal */}
      {selectedContractForPrint && (
        <div
          onClick={() => setSelectedContractForPrint(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in dir-rtl text-right"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[92vh] bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="px-6 py-4 bg-[#f3f3f3] border-b border-zinc-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#141414]" />
                <h3 className="font-bold text-[#141414] text-base">
                  طباعة عقد الاستقدام المعتمد (<span dir="ltr" className="font-mono inline-block">{String(selectedContractForPrint.contract_number || '').replace(/^#/, '')}</span>)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#141414] text-white hover:bg-zinc-800 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedContractForPrint(null)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-zinc-300 text-[#141414] hover:bg-zinc-100 flex items-center gap-1 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>إغلاق</span>
                </button>
              </div>
            </div>
            <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
              <DualBrandingDocumentGenerator
                documentTitle="عقد توسط في استقدام عمالة منزلية موحد (مساند)"
                documentNumber={selectedContractForPrint.contract_number}
                date={new Date().toISOString().slice(0, 10)}
              >
                <div className="flex flex-col gap-3.5 text-xs font-sans text-zinc-800">
                  {/* Contract Status & Musaned Badge */}
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#141414]">رقم توثيق منصة مساند:</span>
                      <span dir="ltr" className="font-mono font-bold text-[#141414] bg-[#f3f3f3] px-2.5 py-0.5 rounded-lg border border-[#e0e0e0] inline-block">
                        {selectedContractForPrint.musaned_number || 'MSN-2026-99201'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#141414]">حالة العقد:</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#f3f3f3] text-[#141414]">
                        {selectedContractForPrint.stage} - ساري وموثق
                      </span>
                    </div>
                  </div>

                  {/* Parties Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* First Party (Company) */}
                    <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-1.5">
                      <h4 className="font-bold text-xs text-[#141414] border-b border-zinc-200 pb-1">
                        الطرف الأول (المرخص له بالاستقدام)
                      </h4>
                      <div className="flex justify-between"><span className="text-[#707070]">الاسم التجاري:</span><strong className="text-[#141414]">مجموعة السليم للاستقدام</strong></div>
                      <div className="flex justify-between"><span className="text-[#707070]">رقم ترخيص الاستقدام:</span><span dir="ltr" className="font-mono font-bold text-[#141414]">390102</span></div>
                      <div className="flex justify-between"><span className="text-[#707070]">السجل التجاري:</span><span dir="ltr" className="font-mono font-bold text-[#141414]">1010884920</span></div>
                      <div className="flex justify-between"><span className="text-[#707070]">الفرع الموثق:</span><span className="font-bold text-[#141414]">{selectedContractForPrint.branch || 'الفرع الرئيسي - الرياض'}</span></div>
                    </div>

                    {/* Second Party (Employer) */}
                    <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-1.5">
                      <h4 className="font-bold text-xs text-[#141414] border-b border-zinc-200 pb-1">
                        الطرف الثاني (صاحب العمل المستقدم)
                      </h4>
                      <div className="flex justify-between"><span className="text-[#707070]">اسم صاحب العمل:</span><strong className="text-[#141414]">{selectedContractForPrint.client_name}</strong></div>
                      <div className="flex justify-between"><span className="text-[#707070]">رقم الهوية / الإقامة:</span><span dir="ltr" className="font-mono font-bold text-[#141414]">{selectedContractForPrint.client_national_id || '1088741920'}</span></div>
                      <div className="flex justify-between"><span className="text-[#707070]">رقم الجوال:</span><span dir="ltr" className="font-mono font-bold text-[#141414]">{selectedContractForPrint.client_phone}</span></div>
                      <div className="flex justify-between"><span className="text-[#707070]">مدينة التسليم:</span><span className="font-bold text-[#141414]">{selectedContractForPrint.delivery_city || 'الرياض'}</span></div>
                    </div>
                  </div>

                  {/* Worker Details */}
                  <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2">
                    <h4 className="font-bold text-xs text-[#141414] border-b border-zinc-200 pb-1">
                      بيانات ومواصفات العمالة المنزلية محل العقد
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                      <div><span className="text-[#707070] block">اسم العامل/ة:</span><strong className="text-[#141414]">{selectedContractForPrint.maid_name}</strong></div>
                      <div><span className="text-[#707070] block">الجنسية:</span><strong className="text-[#141414]">{selectedContractForPrint.nationality}</strong></div>
                      <div><span className="text-[#707070] block">المهنة:</span><strong className="text-[#141414]">عاملة منزلية شاملة</strong></div>
                      <div><span className="text-[#707070] block">رقم جواز السفر:</span><span dir="ltr" className="font-mono font-bold text-[#141414] inline-block">{selectedContractForPrint.maid_passport || 'EP889201'}</span></div>
                      <div><span className="text-[#707070] block">الراتب الشهري:</span><strong className="font-mono text-[#141414]">1,500 ⃁</strong></div>
                      <div><span className="text-[#707070] block">المكتب الخارجي:</span><strong className="text-[#141414]">{(selectedContractForPrint.external_office || 'وكالة إرساليات معتمدة').replace('FOREGIN', 'FOREIGN')}</strong></div>
                      <div><span className="text-[#707070] block">مدة الضمان النظامية:</span><strong className="text-[#141414] font-bold">{selectedContractForPrint.warranty_status === 'نشط' ? '90 يوماً (ضمان مساند ساري)' : (selectedContractForPrint.warranty_status || '90 يوماً')}</strong></div>
                      <div><span className="text-[#707070] block">التأمين على العقد:</span><strong className="text-[#141414] font-bold">ساري لمدة 24 شهراً</strong></div>
                    </div>
                  </div>

                  {/* Legal Terms & Obligations */}
                  <div className="p-3.5 bg-zinc-50/80 rounded-2xl border border-zinc-200 space-y-1 text-[11px] text-zinc-700 leading-relaxed">
                    <h4 className="font-bold text-xs text-[#141414] mb-1">الشروط والأحكام والالتزامات النظامية:</h4>
                    <p>1. يلتزم الطرف الأول باستقدام العاملة المحددة وفق اشتراطات لائحة عمال الخدمة المنزلية وقواعد منصة مساند خلال مدة أقصاها 90 يوماً من تاريخ التوثيق.</p>
                    <p>2. يضمن الطرف الأول العاملة لمدة 90 يوماً تبدأ من تاريخ دخولها المملكة أو استلامها ضد: (رفض العمل، الهروب، الحمل، أو عدم اللياقة الطبية والصحية).</p>
                    <p>3. يشمل هذا العقد وثيقة التأمين الإلزامي على عقود العمالة المنزلية الصادرة عن شركات التأمين المعتمدة برعاية البنك المركزي السعودي ولمدة سنتين.</p>
                    <p>4. تم تحصيل المبلغ الإجمالي عبر القنوات المالية النظامية وقيدها بالحساب البنكي المخصص لمنصة مساند.</p>
                  </div>

                  {/* Financial Breakdown Table */}
                  <div className="overflow-hidden rounded-xl border border-zinc-200">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-zinc-100 text-zinc-700 font-bold">
                        <tr>
                          <th className="p-2.5">البيان المالي</th>
                          <th className="p-2.5 text-center">المبلغ الأساسي</th>
                          <th className="p-2.5 text-center">ضريبة القيمة المضافة (15%)</th>
                          <th className="p-2.5 text-left">الإجمالي المستحق</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-zinc-100 font-mono">
                        <tr>
                          <td className="p-2.5 font-sans font-medium text-[#141414]">خدمات التوسط والاستقدام الشاملة</td>
                          <td className="p-2.5 text-center">{(selectedContractForPrint.amount ?? 14500).toLocaleString()} ⃁</td>
                          <td className="p-2.5 text-center">{((selectedContractForPrint.amount ?? 14500) * 0.15).toLocaleString()} ⃁</td>
                          <td className="p-2.5 text-left font-bold text-[#141414]">{((selectedContractForPrint.amount ?? 14500) * 1.15).toLocaleString()} ⃁</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Signatures & Seal Block */}
                  <div className="grid grid-cols-2 gap-6 pt-3 border-t-2 border-zinc-300">
                    <div className="text-center space-y-3">
                      <div className="font-bold text-[#141414] text-xs">ختم وتوقيع الطرف الأول (الشركة)</div>
                      <div className="w-20 h-20 mx-auto border-2 border-dashed border-[#e0e0e0] rounded-full flex items-center justify-center bg-[#f3f3f3]">
                        <span className="text-[10px] font-bold text-[#141414] text-center leading-tight">مجموعة السليم<br />ختم الاعتماد الرسمي<br />مساند</span>
                      </div>
                    </div>
                    <div className="text-center space-y-3">
                      <div className="font-bold text-[#141414] text-xs">توقيع الطرف الثاني (صاحب العمل)</div>
                      <div className="w-full h-16 border-b-2 border-zinc-400 mt-4 flex items-end justify-center pb-1">
                        <span className="text-[11px] text-[#707070]">التوقيع الإلكتروني معتمد بموجب النفاذ الوطني</span>
                      </div>
                    </div>
                  </div>
                </div>
              </DualBrandingDocumentGenerator>
            </div>
          </div>
        </div>
      )}
      {/* Modals for Sub-modules */}

      {/* 1. Add Dispatch Modal */}
      {showAddDispatchModal && (
        <div
          onClick={() => setShowAddDispatchModal(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-[#141414]" />
                <h3 className="font-bold text-[#141414] text-base">تسجيل إرسالية وتفويج عمالة جديدة</h3>
              </div>
              <button 
                onClick={() => setShowAddDispatchModal(false)}
                className="p-1 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDispatch} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">رقم العقد *</label>
                  <input
                    type="text"
                    required
                    placeholder="SAF-RC-2026-0001"
                    value={dispatchForm.contract_number}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, contract_number: e.target.value })}
                    className="text-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">اسم العميل *</label>
                  <input
                    type="text"
                    required
                    placeholder="محمد عبدالله"
                    value={dispatchForm.client_name}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, client_name: e.target.value })}
                    className="text-input w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">اسم العاملة *</label>
                  <input
                    type="text"
                    required
                    placeholder="MARIA SANTOS"
                    value={dispatchForm.maid_name}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, maid_name: e.target.value })}
                    className="text-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">الجنسية</label>
                  <select
                    value={dispatchForm.nationality}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, nationality: e.target.value })}
                    className="text-input w-full"
                  >
                    <option value="الفلبين">الفلبين</option>
                    <option value="إندونيسيا">إندونيسيا</option>
                    <option value="كينيا">كينيا</option>
                    <option value="أوغندا">أوغندا</option>
                    <option value="إثيوبيا">إثيوبيا</option>
                    <option value="سريلانكا">سريلانكا</option>
                    <option value="بنغلاديش">بنغلاديش</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-600 font-bold mb-1">المكتب الخارجي الشريك</label>
                <input
                  type="text"
                  value={dispatchForm.office_name}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, office_name: e.target.value })}
                  className="text-input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">محطة الوصول بالمملكة</label>
                  <select
                    value={dispatchForm.arrival_station}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, arrival_station: e.target.value })}
                    className="text-input w-full"
                  >
                    <option value="مطار الملك خالد الدولي بالرياض">مطار الملك خالد الدولي بالرياض</option>
                    <option value="مطار الملك عبدالعزيز بجدة">مطار الملك عبدالعزيز بجدة</option>
                    <option value="مطار الملك فهد بالدمام">مطار الملك فهد بالدمام</option>
                    <option value="مطار الأمير محمد بن عبدالعزيز بالمدينة">مطار الأمير محمد بن عبدالعزيز بالمدينة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">تكلفة الإرسالية الخارجية ($)</label>
                  <input
                    type="number"
                    value={dispatchForm.cost_usd}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, cost_usd: e.target.value })}
                    className="text-input w-full"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddDispatchModal(false)}
                  className="button-outline-on-light text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs font-bold shadow-md"
                >
                  حفظ وتسجيل الإرسالية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Extension Modal */}
      {showAddExtensionModal && (
        <div
          onClick={() => setShowAddExtensionModal(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#141414]" />
                <h3 className="font-bold text-[#141414] text-base">تقديم طلب تمديد عقد استقدام</h3>
              </div>
              <button 
                onClick={() => setShowAddExtensionModal(false)}
                className="p-1 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExtension} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">رقم العقد الأصلي *</label>
                  <input
                    type="text"
                    required
                    placeholder="SAF-RC-2025-0890"
                    value={extensionForm.contract_number}
                    onChange={(e) => setExtensionForm({ ...extensionForm, contract_number: e.target.value })}
                    className="text-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">اسم العميل *</label>
                  <input
                    type="text"
                    required
                    placeholder="محمد عبدالله"
                    value={extensionForm.client_name}
                    onChange={(e) => setExtensionForm({ ...extensionForm, client_name: e.target.value })}
                    className="text-input w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">اسم العاملة</label>
                  <input
                    type="text"
                    placeholder="JOYCE MWANGI"
                    value={extensionForm.maid_name}
                    onChange={(e) => setExtensionForm({ ...extensionForm, maid_name: e.target.value })}
                    className="text-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">مدة التمديد المطلوبة</label>
                  <select
                    value={extensionForm.extension_years}
                    onChange={(e) => setExtensionForm({ ...extensionForm, extension_years: e.target.value })}
                    className="text-input w-full"
                  >
                    <option value="1">سنة واحدة (1)</option>
                    <option value="2">سنتان (2)</option>
                    <option value="3">3 سنوات</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-600 font-bold mb-1">مقدم الطلب وقناة التقديم</label>
                <input
                  type="text"
                  value={extensionForm.applicant}
                  onChange={(e) => setExtensionForm({ ...extensionForm, applicant: e.target.value })}
                  className="text-input w-full"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddExtensionModal(false)}
                  className="button-outline-on-light text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs font-bold shadow-md"
                >
                  إرسال طلب التمديد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add Return Modal */}
      {showAddReturnModal && (
        <div
          onClick={() => setShowAddReturnModal(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#141414]" />
                <h3 className="font-bold text-[#141414] text-base">تسجيل طلب استرجاع عقد وتسوية مالية</h3>
              </div>
              <button 
                onClick={() => setShowAddReturnModal(false)}
                className="p-1 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddReturn} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">رقم العقد *</label>
                  <input
                    type="text"
                    required
                    placeholder="SAF-RC-2026-0033"
                    value={returnForm.contract_number}
                    onChange={(e) => setReturnForm({ ...returnForm, contract_number: e.target.value })}
                    className="text-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">اسم العميل *</label>
                  <input
                    type="text"
                    required
                    placeholder="فهد إبراهيم السبيعي"
                    value={returnForm.client_name}
                    onChange={(e) => setReturnForm({ ...returnForm, client_name: e.target.value })}
                    className="text-input w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">اسم العاملة</label>
                  <input
                    type="text"
                    placeholder="FATIMA BEGUM"
                    value={returnForm.maid_name}
                    onChange={(e) => setReturnForm({ ...returnForm, maid_name: e.target.value })}
                    className="text-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">الطرف المتسبب في الإلغاء / الإرجاع</label>
                  <select
                    value={returnForm.cancelled_by}
                    onChange={(e) => setReturnForm({ ...returnForm, cancelled_by: e.target.value as any })}
                    className="text-input w-full"
                  >
                    <option value="client">طلب إلغاء من العميل</option>
                    <option value="worker_refusal">رفض العاملة للعمل / عدم اللياقة الطبية</option>
                    <option value="office">تأخر الاستقدام عن المدة النظامية (90 يوماً)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-zinc-600 font-bold">مبلغ الاسترداد النظامي (⃁)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const matching = contracts.find(c => c.contract_number === returnForm.contract_number);
                      const fee = matching ? Number(matching.amount || matching.total_amount || 14500) : 14500;
                      const signed = matching?.created_at ? new Date(matching.created_at) : new Date(Date.now() - 22 * 86400000);
                      const daysElapsed = Math.max(1, Math.floor((Date.now() - signed.getTime()) / 86400000));
                      const calc = musanedLifecycleEngine.calculateLegalRefund(
                        {
                          musanedContractNumber: returnForm.contract_number,
                          visaNumber: 'VISA-MHRSD-99',
                          workerPassport: matching?.maid_passport || 'PASS-1234',
                          workerName: returnForm.maid_name || matching?.maid_name || 'عاملة',
                          clientNationalId: matching?.client_national_id || '1000000000',
                          clientName: returnForm.client_name || matching?.client_name || 'عميل',
                          companyId: activeCompanyId || 'KAS',
                          recruitmentFee: fee,
                          vatAmount: fee * 0.15,
                          signedDate: signed.toISOString(),
                          maxSlaDays: 90,
                          daysElapsed,
                        },
                        returnForm.cancelled_by,
                        returnForm.cancelled_by === 'worker_refusal' ? 'رفض العمل أو عدم اللياقة' : returnForm.cancelled_by === 'office' ? 'تجاوز مدة الاستقدام' : 'طلب إلغاء من العميل'
                      );
                      setReturnForm({
                        ...returnForm,
                        client_name: returnForm.client_name || matching?.client_name || '',
                        maid_name: returnForm.maid_name || matching?.maid_name || '',
                        refund_amount: String(calc.netRefundAmount),
                        notes: `${calc.legalReasonAr} [استقطاع إداري: ${calc.adminFeeDeduction} ⃁ | النسبة: ${calc.refundPercentage}%]`,
                      });
                    }}
                    className="text-[10px] font-bold text-[#141414] bg-[#f3f3f3] hover:bg-[#eaeaea] px-2.5 py-0.5 rounded-full border border-[#e0e0e0] flex items-center gap-1 transition-all"
                  >
                    <Zap className="w-3 h-3 text-[#141414]" />
                    حساب نظامي آلي (مساند)
                  </button>
                </div>
                <input
                  type="number"
                  value={returnForm.refund_amount}
                  onChange={(e) => setReturnForm({ ...returnForm, refund_amount: e.target.value })}
                  className="text-input w-full font-bold text-[#141414]"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] text-[#141414] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#141414] shrink-0 mt-0.5" />
                <span>
                  <strong>ضمان مساند المالي:</strong> يتم احتساب الاسترداد وفق الضوابط الوزارية (استقطاع إداري 5% خلال أول 30 يوماً، أو 20% بعد ذلك، واسترداد 100% في حال التأخير عن 90 يوماً أو رفض العمالة).
                </span>
              </div>

              <div>
                <label className="block text-zinc-600 font-bold mb-1">سبب الاسترجاع وملاحظات التسوية *</label>
                <textarea
                  rows={3}
                  required
                  value={returnForm.notes}
                  onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                  className="text-input w-full"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddReturnModal(false)}
                  className="button-outline-on-light text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs font-bold bg-[#141414] hover:bg-[#262626] text-white shadow-md"
                >
                  تسجيل طلب الاسترجاع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Add Insurance Modal */}
      {showAddInsuranceModal && (
        <div
          onClick={() => setShowAddInsuranceModal(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#141414]" />
                <h3 className="font-bold text-[#141414] text-base">إصدار وثيقة تأمين مساند جديدة (24 شهراً)</h3>
              </div>
              <button 
                onClick={() => setShowAddInsuranceModal(false)}
                className="p-1 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddInsurance} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">رقم العقد *</label>
                  <input
                    type="text"
                    required
                    placeholder="SAF-RC-2026-0004"
                    value={insuranceForm.contract_number}
                    onChange={(e) => setInsuranceForm({ ...insuranceForm, contract_number: e.target.value })}
                    className="text-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">اسم العميل *</label>
                  <input
                    type="text"
                    required
                    placeholder="سلطان المنصور"
                    value={insuranceForm.client_name}
                    onChange={(e) => setInsuranceForm({ ...insuranceForm, client_name: e.target.value })}
                    className="text-input w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">اسم العاملة</label>
                  <input
                    type="text"
                    placeholder="LUCY WANJIRU"
                    value={insuranceForm.maid_name}
                    onChange={(e) => setInsuranceForm({ ...insuranceForm, maid_name: e.target.value })}
                    className="text-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">شركة التأمين المعتمدة</label>
                  <select
                    value={insuranceForm.company}
                    onChange={(e) => setInsuranceForm({ ...insuranceForm, company: e.target.value })}
                    className="text-input w-full"
                  >
                    <option value="شركة تكافل الراجحي للتأمين">شركة تكافل الراجحي للتأمين</option>
                    <option value="الشركة التعاونية للتأمين (Tawuniya)">الشركة التعاونية للتأمين (Tawuniya)</option>
                    <option value="شركة سلامة للتأمين التعاوني">شركة سلامة للتأمين التعاوني</option>
                    <option value="شركة المتوسط والخليج للتأمين (ميدغلف)">شركة المتوسط والخليج للتأمين (ميدغلف)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">رقم الوثيقة (تلقائي إن ترك فارغاً)</label>
                  <input
                    type="text"
                    placeholder="TR-REC-9982105"
                    value={insuranceForm.policy_no}
                    onChange={(e) => setInsuranceForm({ ...insuranceForm, policy_no: e.target.value })}
                    className="text-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">قسط التأمين الإلزامي (⃁)</label>
                  <input
                    type="number"
                    value={insuranceForm.premium_sar}
                    onChange={(e) => setInsuranceForm({ ...insuranceForm, premium_sar: e.target.value })}
                    className="text-input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-600 font-bold mb-1">حدود التغطية التأمينية</label>
                <input
                  type="text"
                  value={insuranceForm.coverage}
                  onChange={(e) => setInsuranceForm({ ...insuranceForm, coverage: e.target.value })}
                  className="text-input w-full"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddInsuranceModal(false)}
                  className="button-outline-on-light text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs font-bold shadow-md"
                >
                  إصدار وتوثيق الوثيقة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruitmentContractsPage;
