import React, { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { useRentContracts, useTableMutation } from '../hooks/queries/useErpQueries';
import { useCompany } from '../contexts/CompanyContext';
import { DualBrandingDocumentGenerator } from '../components/common/DualBrandingDocumentGenerator';
import { useAppStore } from '../stores/appStore';
import { 
  Plus, FileSpreadsheet, Search, Handshake, X, Car, Users, CheckCircle2, 
  Trash2, Edit, Layers, Calendar, DollarSign, Eye, EyeOff, RefreshCw, 
  UserCheck, Sparkles 
} from 'lucide-react';
import { realErpDataStore } from '../services/realErpDataStore';

export interface RentContractRecord {
  id: string;
  company_id: string;
  contract_number: string;
  client_name: string;
  client_phone: string;
  client_national_id?: string;
  maid_name: string;
  nationality: string;
  package_name?: string;
  start_date: string;
  end_date: string;
  duration_months: number;
  monthly_cost: number;
  tax_amount?: number;
  total_amount: number;
  status: 'جديد' | 'نشط' | 'مرسل' | 'موصد' | 'تم التسليم' | 'مكتمل' | 'ملغي';
  payment_status: 'معلق' | 'تم الدفع' | 'بانتظار التحويل';
  marketer?: string;
  branch: string;
  created_at: string;
}

interface RentPackage {
  id: string;
  title: string;
  nationality: string;
  order: number;
  rent_type: string;
  duration: string;
  price_before_tax: number;
  tax: number;
  total_price: number;
  days_count: number;
  is_visible: boolean;
}

export interface RentalDriver {
  id: string;
  name: string;
  nat: string;
  lic: string;
  lic_status: string;
  car: string;
  client: string;
  salary: number;
  status: string;
}

export interface RentalMaid {
  id: string;
  name: string;
  nat: string;
  pass: string;
  skill: string;
  client: string;
  end: string;
  price: number;
  status: string;
}

const MOCK_PACKAGES: RentPackage[] = [
  {
    id: 'PKG-01',
    title: 'باقة الشهر - عمالة منزلية إندونيسية',
    nationality: 'إندونيسيا',
    order: 1,
    rent_type: 'شهري',
    duration: 'شهر واحد',
    price_before_tax: 3000,
    tax: 450,
    total_price: 3450,
    days_count: 30,
    is_visible: true,
  },
  {
    id: 'PKG-02',
    title: 'باقة الثلاثة أشهر - عمالة منزلية إثيوبية',
    nationality: 'إثيوبيا',
    order: 2,
    rent_type: '3 أشهر',
    duration: '3 أشهر',
    price_before_tax: 4500,
    tax: 675,
    total_price: 5175,
    days_count: 90,
    is_visible: true,
  },
  {
    id: 'PKG-03',
    title: 'باقة ستة أشهر - عمالة منزلية فلبينية متميزة',
    nationality: 'الفلبين',
    order: 3,
    rent_type: '6 أشهر',
    duration: '6 أشهر',
    price_before_tax: 18000,
    tax: 2700,
    total_price: 20700,
    days_count: 180,
    is_visible: true,
  },
];

const MOCK_DRIVERS: RentalDriver[] = [
  { id: 'DRV-01', name: 'RAJESH KUMAR', nat: 'الهند', lic: 'DL-992810', lic_status: 'سارية', car: 'تويوتا كامري 2024 (لوحة 4410)', client: 'عبدالرحمن السليم', salary: 2200, status: 'مؤجر ونشط' },
  { id: 'DRV-02', name: 'MOHAMMED ISLAM', nat: 'بنغلاديش', lic: 'DL-882711', lic_status: 'سارية', car: 'هيونداي H1 (لوحة 7721)', client: 'حساب مجموعة السليم', salary: 2000, status: 'مؤجر ونشط' },
  { id: 'DRV-03', name: 'ALI HASSAN', nat: 'باكستان', lic: 'DL-119283', lic_status: 'سارية', car: 'نيسان صني (لوحة 3312)', client: 'غير معين (متاح للتأجير)', salary: 2000, status: 'متاح للتعاقد' },
  { id: 'DRV-04', name: 'SURESH PATEL', nat: 'الهند', lic: 'DL-773829', lic_status: 'سارية', car: 'غير معين', client: 'غير معين (متاح للتأجير)', salary: 2200, status: 'متاح للتعاقد' },
];

const MOCK_MAIDS: RentalMaid[] = [
  { id: 'DOM-01', name: 'SITI NURHALIZA', nat: 'إندونيسيا', pass: 'IQ-22910481', skill: 'عاملة منزلية + طبخ سعودي', client: 'سعود بن فهد التميمي', end: '2026-11-15', price: 3200, status: 'مؤجرة حالياً' },
  { id: 'DOM-02', name: 'MARITESS SANTOS', nat: 'الفلبين', pass: 'IQ-23491029', skill: 'رعاية أطفال + إتقان الإنجليزية', client: 'د. منيرة القحطاني', end: '2026-10-30', price: 3500, status: 'مؤجرة حالياً' },
  { id: 'DOM-03', name: 'TIGIST ALEMU', nat: 'إثيوبيا', pass: 'IQ-24810293', skill: 'نظافة وغسيل ورعاية منزلية', client: 'متاح للتعاقد الفوري', end: '-', price: 2800, status: 'متاح للتأجير' },
  { id: 'DOM-04', name: 'FATIMA NABATANZI', nat: 'أوغندا', pass: 'IQ-25910284', skill: 'عاملة منزلية ورعاية كبار سن', client: 'متاح للتعاقد الفوري', end: '-', price: 2700, status: 'متاح للتأجير' },
];

const DEFAULT_MOCK_RENT_CONTRACTS: RentContractRecord[] = [
  {
    id: 'rent-1',
    company_id: 'SAF',
    contract_number: 'SAF-RENT-2026-0014',
    client_name: 'ابو عبدالله',
    client_phone: '+966535666840',
    client_national_id: '1088273619',
    maid_name: 'Rental A21221 (سيتي نورعيني)',
    nationality: 'إندونيسيا',
    package_name: 'باقة الشهر الإندونيسي',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    duration_months: 1,
    monthly_cost: 3000.0,
    tax_amount: 450.0,
    total_amount: 3450.0,
    status: 'نشط',
    payment_status: 'تم الدفع',
    marketer: 'سارة خالد (مشرفة التأجير)',
    branch: 'فرع الرياض الرئيسي',
    created_at: new Date().toISOString(),
  },
  {
    id: 'rent-2',
    company_id: 'SAF',
    contract_number: 'SAF-RENT-2026-0016',
    client_name: 'ابو اياد',
    client_phone: '+966562404213',
    client_national_id: '1099281726',
    maid_name: 'Rental A2122121 (رحمة أديسي)',
    nationality: 'إثيوبيا',
    package_name: 'باقة الشهر الإثيوبي',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    duration_months: 2,
    monthly_cost: 1500.0,
    tax_amount: 450.0,
    total_amount: 3450.0,
    status: 'نشط',
    payment_status: 'معلق',
    marketer: 'فهد العتيبي',
    branch: 'فرع الرياض الرئيسي',
    created_at: new Date().toISOString(),
  },
];

export const RentContractsPage: React.FC = () => {
  const { activeCompanyId, activeCompany } = useCompany();
  const { data: rawRentContracts = [] } = useRentContracts();
  const { createItem, updateItem, deleteItem } = useTableMutation('rent_contracts');
  const { addNotification } = useAppStore();

  const rentContracts: RentContractRecord[] =
    rawRentContracts.length > 0 ? (rawRentContracts as RentContractRecord[]) : DEFAULT_MOCK_RENT_CONTRACTS;

  const storeActiveTab = useAppStore(state => state.activeTab);

  const getMappedTab = (tabKey: string): 'all' | 'active' | 'sent' | 'locked' | 'delivered' | 'completed' | 'packages' | 'drivers' | 'domestic' | 'orders' | 'terms' => {
    switch (tabKey) {
      case 'active-rent': return 'active';
      case 'transferred-rent': return 'delivered';
      case 'completed-rent': return 'completed';
      case 'rent-packages': return 'packages';
      case 'rental-drivers': return 'drivers';
      case 'rental-domestic': return 'domestic';
      case 'rental-orders': return 'orders';
      case 'rent-contract-terms': return 'terms';
      default: return 'all';
    }
  };

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'sent' | 'locked' | 'delivered' | 'completed' | 'packages' | 'drivers' | 'domestic' | 'orders' | 'terms'>(() => getMappedTab(storeActiveTab));

  useEffect(() => {
    setActiveTab(getMappedTab(storeActiveTab));
    if (storeActiveTab === 'create-rent') {
      setShowAddModal(true);
    }
  }, [storeActiveTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(() => storeActiveTab === 'create-rent');
  const [editingContract, setEditingContract] = useState<RentContractRecord | null>(null);
  const [selectedContractForPrint, setSelectedContractForPrint] = useState<RentContractRecord | null>(null);

  // Form State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNationalId, setClientNationalId] = useState('');
  const [maidName, setMaidName] = useState('');
  const [nationality, setNationality] = useState('إندونيسيا');
  const [durationMonths, setDurationMonths] = useState('1');
  const [monthlyCost, setMonthlyCost] = useState('3000');
  const [branch, setBranch] = useState('فرع الرياض الرئيسي');

  // Sub-modules state with realErpDataStore persistence
  const [rentalDrivers, setRentalDrivers] = useState<RentalDriver[]>([]);
  const [rentalMaids, setRentalMaids] = useState<RentalMaid[]>([]);
  const [rentPackages, setRentPackages] = useState<RentPackage[]>([]);
  const [rentalOrders, setRentalOrders] = useState([
    { id: 'ORD-R-101', client: 'عبدالله بن سعد الدوسري', job: 'عاملة منزلية بالشهر', nat: 'الفلبين', dur: '3 أشهر', date: '2026-09-01', deposit: 1000, status: 'بانتظار التعميد' },
    { id: 'ORD-R-102', client: 'شركة الأفق للمقاولات', job: 'سائق خاص', nat: 'الهند', dur: '12 شهر', date: '2026-08-25', deposit: 2500, status: 'تم الفحص والموافقة' },
    { id: 'ORD-R-103', client: 'نورة بنت محمد آل الشيخ', job: 'مربية أطفال', nat: 'إندونيسيا', dur: '6 أشهر', date: '2026-09-05', deposit: 1500, status: 'بانتظار التعميد' },
  ]);
  const [rentTerms, setRentTerms] = useState(() => {
    try {
      const saved = localStorage.getItem('ALSULAIM_RENT_TERMS');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        title: 'البند الأول: موضوع العقد وطبيعة التشغيل',
        body: 'يلتزم الطرف الأول (الشركة المؤجرة) بتوفير خدمات العامل/العاملة المنزلية للطرف الثاني (المستأجر) خلال مدة العقد المحددة، وتبقى كفالة العامل/العاملة تحت مظلة الشركة طوال مدة التشغيل.',
      },
      {
        title: 'البند الثاني: التزامات الشركة (الطرف الأول)',
        body: 'تلتزم الشركة بصرف رواتب العاملة في مواعيدها النظامية، وتوفير التغطية التأمينية الطبية الشاملة، واستبدال العاملة في حال رفض العمل أو العجز الصحي خلال 48 ساعة دون رسوم إضافية.',
      },
      {
        title: 'البند الثالث: التزامات المستأجر (الطرف الثاني)',
        body: 'يلتزم المستأجر بتوفير بيئة سكنية ومعيشية لائقة ومناسبة، وتأمين الوجبات الغذائية، وساعات راحة يومية لا تقل عن 9 ساعات، وعدم تشغيل العاملة لدى أي طرف ثالث أو تكليفها بأعمال خطرة.',
      },
      {
        title: 'البند الرابع: الشروط الجزائية والتسوية المالية',
        body: 'في حال رغبة المستأجر بإنهاء العقد قبل انقضاء مدته يتم خصم قيمة الأيام الفعلية بالإضافة إلى رسوم إدارية بنسبة 10% من قيمة المدة المتبقية، مع إعادة كامل مبلغ التأمين بعد تسليم العاملة واستلام براءة الذمة.',
      },
    ];
  });

  // Modals for sub-modules
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [showAddMaidModal, setShowAddMaidModal] = useState(false);
  const [showAddPackageModal, setShowAddPackageModal] = useState(false);

  // Form states for sub-modules
  const [driverForm, setDriverForm] = useState({
    name: '',
    nat: 'الهند',
    lic: '',
    lic_status: 'سارية',
    car: 'غير معين (متاح للتأجير)',
    salary: '2200',
  });

  const [maidForm, setMaidForm] = useState({
    name: '',
    nat: 'إندونيسيا',
    pass: '',
    skill: 'عاملة منزلية شاملة وطبخ',
    price: '3200',
  });

  const [packageForm, setPackageForm] = useState({
    title: '',
    nationality: 'إندونيسيا',
    rent_type: 'شهري',
    duration: 'شهر واحد',
    price_before_tax: '3000',
    days_count: '30',
  });

  useEffect(() => {
    realErpDataStore.getRecords<RentalDriver>('rental_drivers', MOCK_DRIVERS).then(setRentalDrivers);
    realErpDataStore.getRecords<RentalMaid>('rental_maids', MOCK_MAIDS).then(setRentalMaids);
    realErpDataStore.getRecords<RentPackage>('rent_packages', MOCK_PACKAGES).then(setRentPackages);
  }, []);

  // Sub-module handlers
  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverForm.name) return;

    const newDriver: RentalDriver = {
      id: `DRV-${String(rentalDrivers.length + 1).padStart(2, '0')}`,
      name: driverForm.name,
      nat: driverForm.nat,
      lic: driverForm.lic || `DL-${Date.now().toString().slice(-6)}`,
      lic_status: driverForm.lic_status,
      car: driverForm.car,
      client: 'غير معين (متاح للتأجير)',
      salary: parseFloat(driverForm.salary) || 2200,
      status: 'متاح للتعاقد',
    };

    const updated = await realErpDataStore.addRecord('rental_drivers', newDriver, MOCK_DRIVERS);
    setRentalDrivers(updated);
    setShowAddDriverModal(false);
    setDriverForm({
      name: '',
      nat: 'الهند',
      lic: '',
      lic_status: 'سارية',
      car: 'غير معين (متاح للتأجير)',
      salary: '2200',
    });

    addNotification({
      title: 'إضافة سائق جديد',
      message: `تم تسجيل السائق (${newDriver.name}) في أسطول التأجير.`,
      type: 'success',
    });
  };

  const handleToggleDriverStatus = async (d: RentalDriver) => {
    const nextStatus = d.status === 'مؤجر ونشط' ? 'متاح للتعاقد' : 'مؤجر ونشط';
    const nextClient = nextStatus === 'مؤجر ونشط' ? 'قيد التعاقد' : 'غير معين (متاح للتأجير)';
    const updated = await realErpDataStore.updateRecord('rental_drivers', d.id, { status: nextStatus, client: nextClient }, MOCK_DRIVERS);
    setRentalDrivers(updated);
    addNotification({
      title: 'تحديث حالة السائق',
      message: `تم تغيير حالة السائق (${d.name}) إلى (${nextStatus}).`,
      type: 'info',
    });
  };

  const handleDeleteDriver = async (d: RentalDriver) => {
    if (window.confirm(`هل أنت متأكد من حذف السائق (${d.name})؟`)) {
      const updated = await realErpDataStore.deleteRecord('rental_drivers', d.id, MOCK_DRIVERS);
      setRentalDrivers(updated);
      addNotification({
        title: 'حذف سائق',
        message: `تم حذف السائق (${d.name}) بنجاح.`,
        type: 'error',
      });
    }
  };

  const handleAddMaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maidForm.name) return;

    const newMaid: RentalMaid = {
      id: `DOM-${String(rentalMaids.length + 1).padStart(2, '0')}`,
      name: maidForm.name,
      nat: maidForm.nat,
      pass: maidForm.pass || `IQ-${Date.now().toString().slice(-8)}`,
      skill: maidForm.skill,
      client: 'متاح للتعاقد الفوري',
      end: '-',
      price: parseFloat(maidForm.price) || 3000,
      status: 'متاح للتأجير',
    };

    const updated = await realErpDataStore.addRecord('rental_maids', newMaid, MOCK_MAIDS);
    setRentalMaids(updated);
    setShowAddMaidModal(false);
    setMaidForm({
      name: '',
      nat: 'إندونيسيا',
      pass: '',
      skill: 'عاملة منزلية شاملة وطبخ',
      price: '3200',
    });

    addNotification({
      title: 'إضافة عاملة تأجير',
      message: `تم تسجيل العاملة (${newMaid.name}) في قائمة التأجير المتاح.`,
      type: 'success',
    });
  };

  const handleFastCreateContractFromMaid = (m: RentalMaid) => {
    setMaidName(m.name);
    setNationality(m.nat);
    setMonthlyCost(String(m.price));
    setDurationMonths('1');
    setShowAddModal(true);
    addNotification({
      title: 'إنشاء عقد تأجير',
      message: `تم اختيار العاملة (${m.name}) وتعبئة بيانات العقد تلقائياً.`,
      type: 'info',
    });
  };

  const handleDeleteMaid = async (m: RentalMaid) => {
    if (window.confirm(`هل أنت متأكد من حذف العاملة (${m.name})؟`)) {
      const updated = await realErpDataStore.deleteRecord('rental_maids', m.id, MOCK_MAIDS);
      setRentalMaids(updated);
      addNotification({
        title: 'حذف عاملة',
        message: `تم حذف العاملة (${m.name}) بنجاح.`,
        type: 'error',
      });
    }
  };

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageForm.title) return;

    const base = parseFloat(packageForm.price_before_tax) || 3000;
    const pTax = base * 0.15;
    const pTotal = base + pTax;

    const newPkg: RentPackage = {
      id: `PKG-${String(rentPackages.length + 1).padStart(2, '0')}`,
      title: packageForm.title,
      nationality: packageForm.nationality,
      order: rentPackages.length + 1,
      rent_type: packageForm.rent_type,
      duration: packageForm.duration,
      price_before_tax: base,
      tax: pTax,
      total_price: pTotal,
      days_count: parseInt(packageForm.days_count) || 30,
      is_visible: true,
    };

    const updated = await realErpDataStore.addRecord('rent_packages', newPkg, MOCK_PACKAGES);
    setRentPackages(updated);
    setShowAddPackageModal(false);
    setPackageForm({
      title: '',
      nationality: 'إندونيسيا',
      rent_type: 'شهري',
      duration: 'شهر واحد',
      price_before_tax: '3000',
      days_count: '30',
    });

    addNotification({
      title: 'إضافة باقة تأجير',
      message: `تم إضافة باقة (${newPkg.title}) بنجاح.`,
      type: 'success',
    });
  };

  const handleTogglePackageVisibility = async (pkg: RentPackage) => {
    const updated = await realErpDataStore.updateRecord('rent_packages', pkg.id, { is_visible: !pkg.is_visible }, MOCK_PACKAGES);
    setRentPackages(updated);
    addNotification({
      title: 'تعديل ظهور الباقة',
      message: `تم تحديث ظهور الباقة (${pkg.title}) للعملاء.`,
      type: 'info',
    });
  };

  const handleDeletePackage = async (pkg: RentPackage) => {
    if (window.confirm(`هل أنت متأكد من حذف الباقة (${pkg.title})؟`)) {
      const updated = await realErpDataStore.deleteRecord('rent_packages', pkg.id, MOCK_PACKAGES);
      setRentPackages(updated);
      addNotification({
        title: 'حذف باقة',
        message: `تم حذف الباقة بنجاح.`,
        type: 'error',
      });
    }
  };

  const months = parseInt(durationMonths) || 1;
  const monthly = parseFloat(monthlyCost) || 3000;
  const tax = monthly * months * 0.15;
  const totalAmount = monthly * months + tax;

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !maidName) return;

    const companyCode = activeCompanyId !== 'all' ? activeCompanyId : 'SAF';
    const contractNumber = `${companyCode}-RENT-${new Date().getFullYear()}-${String(rentContracts.length + 1).padStart(4, '0')}`;

    const newRecord = {
      id: contractNumber,
      company_id: companyCode,
      contract_number: contractNumber,
      client_name: clientName,
      client_phone: clientPhone,
      client_national_id: clientNationalId,
      maid_name: maidName,
      nationality,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      duration_months: months,
      monthly_cost: monthly,
      tax_amount: tax,
      total_amount: totalAmount,
      status: 'نشط' as const,
      payment_status: 'تم الدفع' as const,
      branch,
    };

    await createItem.mutateAsync(newRecord);
    addNotification({
      title: 'إضافة عقد تأجير جديد',
      message: `تم إنشاء عقد التأجير #${contractNumber} للعميل (${clientName}) بنجاح.`,
      type: 'success',
    });
    setShowAddModal(false);
    setClientName('');
    setClientPhone('');
    setMaidName('');
  };

  const handleDeleteContract = async (contract: RentContractRecord) => {
    if (window.confirm(`هل أنت متأكد من حذف عقد التأجير #${contract.contract_number}؟`)) {
      await deleteItem.mutateAsync(contract.id);
      addNotification({
        title: 'حذف عقد التأجير',
        message: `تم حذف عقد التأجير #${contract.contract_number} بنجاح.`,
        type: 'error',
      });
    }
  };

  const getFilteredContracts = () => {
    return rentContracts.filter((c) => {
      const matchesSearch =
        (c.contract_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.client_name || '').includes(searchQuery) ||
        (c.maid_name || '').includes(searchQuery);

      if (!matchesSearch) return false;

      if (activeTab === 'active') return c.status === 'نشط';
      if (activeTab === 'sent') return c.status === 'مرسل';
      if (activeTab === 'locked') return c.status === 'موصد';
      if (activeTab === 'delivered') return c.status === 'تم التسليم';
      if (activeTab === 'completed') return c.status === 'مكتمل';

      return true;
    });
  };

  const currentDisplayList = getFilteredContracts();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div
        className="card-feature-cinematic"
        style={{
          background: '#000000',
          borderRadius: '16px',
          padding: '28px',
          color: '#FFFFFF',
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
            type="flexible-rental"
            size="sm"
            showBackground={false}
            className="!w-16 !h-14 shrink-0"
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>RENTAL CONTRACTS SUITE</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
              عقود التأجير وباقات التشغيل
            </h1>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '4px 0 0 0', fontWeight: 420 }}>
              إدارة عقود التأجير الشهري واليومي، باقات الأسعار، وتوثيق السندات لـ {activeCompany.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-document-extractor'))}
            className="button-outline-on-dark"
            style={{ fontSize: '12.5px', padding: '6px 16px', minHeight: '38px', borderColor: 'rgba(207, 166, 74, 0.55)', background: 'rgba(207, 166, 74, 0.14)', color: '#F5EDDC', fontWeight: 700 }}
          >
            <Handshake className="w-4 h-4 ml-1 text-[#CFA64A]" />
            <span>استخلاص عقود التأجير آلياً (PDF / Word / Excel)</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="button-white-pill"
            style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}
          >
            <Plus className="w-4 h-4 ml-1" />
            <span>+ إضافة عقد تأجير جديد</span>
          </button>
          <ExportDropdown
            sectionKey="rent-contracts"
            data={currentDisplayList}
            customTitle={`عقود التأجير التشغيلي - ${activeCompany.name}`}
            variant="outline-dark"
            buttonLabel="تصدير كشوفات التأجير (10 صيغ)"
          />
        </div>
      </div>

      {/* 4 Signature KPI Cards Row matching exact design screenshot */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {/* Card 1: White Card */}
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>إجمالي عقود التأجير</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {rentContracts.length || 13} عقد
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>شهري وسنوي وخدمة معروف</span>
        </div>

        {/* Card 2: Pistachio Band Card */}
        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
          <span style={{ fontSize: '13px', color: '#000000', fontWeight: 550 }}>العقود النشطة ومسيرات الخدمة</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {rentContracts.filter(c => c.status === 'نشط').length || 4} نشط
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>عمالة منزلية وسائقين</span>
        </div>

        {/* Card 3: Pitch Black Featured Card */}
        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#000000', color: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 550 }}>إجمالي المبيعات الشهرية المحققة</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {((rentContracts.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 128500) / 1000).toFixed(1)}k ⃁
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>سداد آلي شامل الضريبة 15%</span>
        </div>

        {/* Card 4: White Card */}
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>نسبة الجاهزية والتسليم</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#000000', marginTop: '6px', letterSpacing: '-0.02em' }}>
            100%
          </div>
          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-2">
            <div className="w-full h-full bg-emerald-500 rounded-full" />
          </div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>تغطية تأمينية وبدائل فورية</span>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-200 pb-3">
        {[
          { id: 'all', label: `جميع عقود التأجير (${rentContracts.length || 13})` },
          { id: 'active', label: 'عقود نشطة (2)' },
          { id: 'orders', label: 'طلبات وحجوزات الإيجار (3) ' },
          { id: 'drivers', label: 'سائقين خاصين بنظام التأجير (4) ' },
          { id: 'domestic', label: 'عاملات منزليات بنظام التأجير (6) ' },
          { id: 'packages', label: `باقات التأجير (${MOCK_PACKAGES.length || 2})` },
          { id: 'terms', label: 'بنود وشروط عقد الإيجار ' },
          { id: 'sent', label: 'عقود مرسلة (1)' },
          { id: 'locked', label: 'عقود موصدة (2)' },
          { id: 'delivered', label: 'تم التسليم (0)' },
          { id: 'completed', label: 'عقود مكتملة (7)' },
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
                borderColor: isActive ? '#000000' : '#e4e4e7',
                backgroundColor: isActive ? '#000000' : '#ffffff',
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

      {/* 1. Rental Orders View */}
      {activeTab === 'orders' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between">
            <h2 className="display-sm" style={{ fontSize: '18px', fontWeight: 330, color: '#000000', margin: 0 }}>
              طلبات وحجوزات عقود الإيجار الواردة
            </h2>
            <span className="pill-tag-mint" style={{ fontSize: '11px' }}>3 طلبات جديدة</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">رقم الحجز</th>
                  <th className="p-3.5">اسم العميل</th>
                  <th className="p-3.5">المهنة المطلوبة</th>
                  <th className="p-3.5">الجنسية المفضلة</th>
                  <th className="p-3.5">المدة المطلوبة</th>
                  <th className="p-3.5">تاريخ البدء</th>
                  <th className="p-3.5">مبلغ العربون</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rentalOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-mono font-bold text-black">{ord.id}</td>
                    <td className="p-3.5 font-bold text-black">{ord.client}</td>
                    <td className="p-3.5">{ord.job}</td>
                    <td className="p-3.5">{ord.nat}</td>
                    <td className="p-3.5 font-bold text-black">{ord.dur}</td>
                    <td className="p-3.5 font-mono text-zinc-500">{ord.date}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-700">{ord.deposit} ⃁</td>
                    <td className="p-3.5"><Badge text={ord.status} type={ord.status.includes('تم') ? 'success' : 'warning'} /></td>
                    <td className="p-3.5 text-center">
                      <button
                        disabled={ord.status === 'تم التحويل لعقد نشط'}
                        onClick={async () => {
                          setRentalOrders(prev =>
                            prev.map(item =>
                              item.id === ord.id ? { ...item, status: 'تم التحويل لعقد نشط' } : item
                            )
                          );
                          const months = parseInt(ord.dur) || 3;
                          const monthlyRate = 3000;
                          const totalBeforeTax = months * monthlyRate;
                          const tax = Math.round(totalBeforeTax * 0.15);
                          await createItem.mutateAsync({
                            id: `RNT-${Date.now().toString().slice(-4)}`,
                            company_id: activeCompanyId !== 'all' ? activeCompanyId : 'YAQ',
                            contract_no: `RC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
                            client_name: ord.client,
                            client_phone: '0550001122',
                            client_national_id: '1044556677',
                            maid_name: `كوادر (${ord.job})`,
                            nationality: ord.nat,
                            duration_months: months,
                            monthly_cost: monthlyRate,
                            total_before_tax: totalBeforeTax,
                            vat_amount: tax,
                            total_with_tax: totalBeforeTax + tax,
                            status: 'نشط - قيد التشغيل',
                            start_date: ord.date,
                            end_date: '2026-12-01',
                            branch: 'فرع الرياض الرئيسي',
                            created_at: new Date().toISOString(),
                          });
                          addNotification({
                            title: 'تحويل الحجز لعقد إيجار رسمي',
                            message: `تم تحويل الطلب #${ord.id} للعميل (${ord.client}) إلى عقد إيجار نشط وإدراجه في سجل العقود.`,
                            type: 'success',
                          });
                        }}
                        className="button-primary-pill disabled:opacity-50"
                        style={{ fontSize: '11px', padding: '2px 10px', minHeight: '26px' }}
                      >
                        {ord.status === 'تم التحويل لعقد نشط' ? 'تم التحويل ✓' : 'تحويل لعقد'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Rental Drivers View */}
      {activeTab === 'drivers' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="display-sm" style={{ fontSize: '18px', fontWeight: 330, color: '#000000', margin: 0 }}>
                سائقين خاصين بنظام التأجير والتشغيل المرن
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5 font-sans">
                إدارة أسطول السائقين المؤهلين للشركات والعائلات ومتابعة رخص القيادة
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                {rentalDrivers.length} سائقين مسجلين
              </span>
              <button
                onClick={() => setShowAddDriverModal(true)}
                className="button-primary-pill text-xs font-bold flex items-center gap-1.5 shadow-md"
                style={{ minHeight: '34px', padding: '6px 16px' }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ تسجيل سائق جديد</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">كود السائق</th>
                  <th className="p-3.5">اسم السائق</th>
                  <th className="p-3.5">الجنسية</th>
                  <th className="p-3.5">رقم رخصة القيادة</th>
                  <th className="p-3.5">حالة الرخصة</th>
                  <th className="p-3.5">المركبة المسندة</th>
                  <th className="p-3.5">العميل الحالي</th>
                  <th className="p-3.5">الراتب الشهري</th>
                  <th className="p-3.5">حالة التشغيل</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rentalDrivers.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-mono font-bold text-black">{d.id}</td>
                    <td className="p-3.5 font-bold text-black">{d.name}</td>
                    <td className="p-3.5">{d.nat}</td>
                    <td className="p-3.5 font-mono text-zinc-600">{d.lic}</td>
                    <td className="p-3.5"><Badge text={d.lic_status} type="success" /></td>
                    <td className="p-3.5 font-semibold text-black">{d.car}</td>
                    <td className="p-3.5 text-zinc-600">{d.client}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-700">{d.salary} ⃁</td>
                    <td className="p-3.5">
                      <Badge 
                        text={d.status} 
                        type={d.status.includes('نشط') ? 'purple' : 'success'} 
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleToggleDriverStatus(d)}
                          className="button-outline-on-light text-[11px] font-bold text-zinc-700 hover:bg-zinc-100"
                          style={{ minHeight: '26px', padding: '2px 8px' }}
                          title="تغيير حالة توفر السائق"
                        >
                          <RefreshCw className="w-3 h-3 ml-1 inline text-zinc-500" />
                          <span>تبديل الحالة</span>
                        </button>
                        <button
                          onClick={() => handleDeleteDriver(d)}
                          className="p-1 text-zinc-400 hover:text-rose-600 rounded transition"
                          title="حذف السائق"
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

      {/* 3. Rental Domestic Maids View */}
      {activeTab === 'domestic' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="display-sm" style={{ fontSize: '18px', fontWeight: 330, color: '#000000', margin: 0 }}>
                عاملات منزليات بنظام التأجير الشهري والسنوي
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5 font-sans">
                إدارة العاملات المتوفرات للتأجير الفوري مع إمكانية تحويلهن لعقد تأجير مباشر
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                {rentalMaids.length} عاملات مسجلات
              </span>
              <button
                onClick={() => setShowAddMaidModal(true)}
                className="button-primary-pill text-xs font-bold flex items-center gap-1.5 shadow-md"
                style={{ minHeight: '34px', padding: '6px 16px' }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ إضافة عاملة تأجير جديدة</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">الكود</th>
                  <th className="p-3.5">اسم العاملة</th>
                  <th className="p-3.5">الجنسية</th>
                  <th className="p-3.5">رقم الإقامة / الجواز</th>
                  <th className="p-3.5">المهنة والمهارات</th>
                  <th className="p-3.5">العميل الحالي</th>
                  <th className="p-3.5">تاريخ نهاية عقد التأجير</th>
                  <th className="p-3.5">سعر الإيجار الشهري</th>
                  <th className="p-3.5">حالة التوفر</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rentalMaids.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-mono font-bold text-black">{m.id}</td>
                    <td className="p-3.5 font-bold text-black">{m.name}</td>
                    <td className="p-3.5">{m.nat}</td>
                    <td className="p-3.5 font-mono text-zinc-600">{m.pass}</td>
                    <td className="p-3.5 text-zinc-700">{m.skill}</td>
                    <td className="p-3.5 font-bold text-black">{m.client}</td>
                    <td className="p-3.5 font-mono text-zinc-500">{m.end}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-700">{m.price} ⃁</td>
                    <td className="p-3.5">
                      <Badge 
                        text={m.status} 
                        type={m.status.includes('مؤجرة') ? 'primary' : 'success'} 
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleFastCreateContractFromMaid(m)}
                          className="button-primary-pill text-[11px] font-bold flex items-center gap-1 shadow-sm"
                          style={{ minHeight: '26px', padding: '2px 8px', backgroundColor: '#000000' }}
                          title="إنشاء عقد تأجير مباشر لهذه العاملة"
                        >
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          <span>إنشاء عقد فوري</span>
                        </button>
                        <button
                          onClick={() => handleDeleteMaid(m)}
                          className="p-1 text-zinc-400 hover:text-rose-600 rounded transition"
                          title="حذف العاملة"
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

      {/* 4. Rental Packages View */}
      {activeTab === 'packages' && (
        <div className="space-y-6">
          <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
            <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="display-sm" style={{ fontSize: '18px', fontWeight: 330, color: '#000000', margin: 0 }}>
                  باقات تأجير العمالة المنزلية والتشغيل المرن
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5 font-sans">
                  تحديد أسعار الباقات الشهرية والموسمية، ونسب الضريبة، وتخصيص الباقات بحسب الجنسية
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                  {rentPackages.length} باقات معتمدة
                </span>
                <button
                  onClick={() => setShowAddPackageModal(true)}
                  className="button-primary-pill text-xs font-bold flex items-center gap-1.5 shadow-md"
                  style={{ minHeight: '34px', padding: '6px 16px' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ إضافة باقة تأجير جديدة</span>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {rentPackages.map((pkg) => (
                  <div 
                    key={pkg.id} 
                    className="p-5 rounded-3xl border border-zinc-200 hover:border-black/30 transition shadow-sm bg-gradient-to-b from-white to-zinc-50 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="pill-tag-mint text-[11px] font-bold">
                          {pkg.nationality}
                        </span>
                        <Badge 
                          text={pkg.is_visible ? 'ظاهرة للعملاء' : 'مخفية'} 
                          type={pkg.is_visible ? 'success' : 'warning'} 
                        />
                      </div>
                      <h3 className="font-bold text-black text-sm mb-2">{pkg.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        <span>نوع الباقة: {pkg.rent_type} ({pkg.duration} - {pkg.days_count} يوم)</span>
                      </div>

                      <div className="p-3 bg-zinc-100 rounded-2xl mb-4 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">السعر قبل الضريبة:</span>
                          <strong className="font-mono text-black">{(pkg.price_before_tax ?? 0).toLocaleString()} ⃁</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">ضريبة القيمة المضافة (15%):</span>
                          <span className="font-mono text-zinc-600">{(pkg.tax ?? ((pkg.price_before_tax || 0) * 0.15)).toLocaleString()} ⃁</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-zinc-200">
                          <span className="font-bold text-black">الإجمالي شامل الضريبة:</span>
                          <strong className="font-mono font-bold text-emerald-700 text-sm">{(pkg.total_price ?? ((pkg.price_before_tax || 0) * 1.15)).toLocaleString()} ⃁</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-200">
                      <button
                        onClick={() => handleTogglePackageVisibility(pkg)}
                        className="button-outline-on-light text-[11px] font-medium flex items-center gap-1 flex-1 justify-center"
                        style={{ minHeight: '28px' }}
                      >
                        {pkg.is_visible ? <EyeOff className="w-3 h-3 text-zinc-500" /> : <Eye className="w-3 h-3 text-emerald-600" />}
                        <span>{pkg.is_visible ? 'إخفاء' : 'إظهار'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setNationality(pkg.nationality);
                          setMonthlyCost(String(pkg.price_before_tax));
                          setShowAddModal(true);
                        }}
                        className="button-primary-pill text-[11px] font-bold flex items-center gap-1 flex-1 justify-center"
                        style={{ minHeight: '28px', backgroundColor: '#000000' }}
                      >
                        <Plus className="w-3 h-3" />
                        <span>حجز باقة</span>
                      </button>
                      <button
                        onClick={() => handleDeletePackage(pkg)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-full transition"
                        title="حذف الباقة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Contract Terms View */}
      {activeTab === 'terms' && (
        <div className="card-pricing" style={{ padding: '28px', borderRadius: '24px', background: '#ffffff' }}>
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-6">
            <div>
              <h2 className="display-sm" style={{ fontSize: '20px', fontWeight: 330, color: '#000000', margin: 0 }}>
                بنود وضوابط وشروط عقد التأجير الموحد
              </h2>
              <p className="text-xs text-zinc-400 mt-1 font-sans">
                الشروط والالتزامات النظامية المتوافقة مع لوائح وزارة الموارد البشرية والتنمية الاجتماعية
              </p>
            </div>
            <button
              onClick={() => {
                try {
                  localStorage.setItem('ALSULAIM_RENT_TERMS', JSON.stringify(rentTerms));
                } catch {}
                addNotification({
                  title: 'حفظ الشروط المحدثة',
                  message: 'تم حفظ وتحديث بنود عقد التأجير الموحد في قاعدة البيانات بنجاح.',
                  type: 'success',
                });
              }}
              className="button-primary-pill"
              style={{ fontSize: '12px', padding: '6px 18px', minHeight: '36px' }}
            >
              حفظ التعديلات
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {rentTerms.map((term: { title: string; body: string }, idx: number) => (
              <div key={idx} className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
                <h3 className="font-bold text-black text-sm">{term.title}</h3>
                <textarea
                  rows={2}
                  value={term.body}
                  onChange={(e) => {
                    const next = [...rentTerms];
                    next[idx] = { ...next[idx], body: e.target.value };
                    setRentTerms(next);
                  }}
                  className="w-full p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-700 leading-relaxed focus:outline-none focus:border-black"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contracts Table */}
      {['all', 'active', 'sent', 'locked', 'delivered', 'completed'].includes(activeTab) && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-white flex-wrap gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute right-3 top-3 text-zinc-400" />
              <input
                type="text"
                placeholder="البحث برقم العقد، اسم العميل، أو العاملة..."
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

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">رقم العقد</th>
                  <th className="p-3.5">اسم العميل</th>
                  <th className="p-3.5">العاملة والجنسية</th>
                  <th className="p-3.5">مدة الإيجار</th>
                  <th className="p-3.5">تاريخ البداية والنهاية</th>
                  <th className="p-3.5">التكلفة الشهرية</th>
                  <th className="p-3.5">الإجمالي شامل الضريبة</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {currentDisplayList.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-mono text-black font-bold">{c.contract_number}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <CorporateAvatar name={c.client_name} isClient size="xs" />
                        <div>
                          <div className="font-bold text-black">{c.client_name}</div>
                          <div className="text-zinc-500 font-mono">{c.client_phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <CorporateAvatar name={c.maid_name} role="عاملة منزلية" isCandidate size="xs" />
                        <div>
                          <div className="font-bold text-black">{c.maid_name}</div>
                          <div className="text-zinc-500">{c.nationality}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-bold text-black">{c.duration_months} شهر</td>
                    <td className="p-3.5 text-zinc-500 font-mono">
                      {c.start_date} إلى {c.end_date}
                    </td>
                    <td className="p-3.5 font-mono">{(c.monthly_cost ?? 0).toLocaleString()} ⃁</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-700">{(c.total_amount ?? 0).toLocaleString()} ⃁</td>
                    <td className="p-3.5">
                      <Badge text={c.status} type={c.status === 'نشط' ? 'success' : 'primary'} />
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => setSelectedContractForPrint(c)}
                        className="button-outline-on-light"
                        style={{ padding: '3px 12px', fontSize: '11px', minHeight: '28px' }}
                      >
                        طباعة العقد
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Packages Tab */}
      {activeTab === 'packages' && (
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '24px', background: '#ffffff' }}>
          <h3 className="text-base font-bold text-black mb-4">باقات التأجير المعتمدة</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">عنوان الباقة</th>
                  <th className="p-3">الجنسية</th>
                  <th className="p-3">نوع الإيجار</th>
                  <th className="p-3">المدة</th>
                  <th className="p-3">السعر بدون ضريبة</th>
                  <th className="p-3">الضريبة (15%)</th>
                  <th className="p-3">الإجمالي بعد الضريبة</th>
                  <th className="p-3">عدد الأيام</th>
                  <th className="p-3">الظهور</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {MOCK_PACKAGES.map((pkg, idx) => (
                  <tr key={pkg.id} className="hover:bg-zinc-50">
                    <td className="p-3 font-mono font-bold text-black">{idx + 1}</td>
                    <td className="p-3 font-bold text-black">{pkg.title}</td>
                    <td className="p-3 text-zinc-600">{pkg.nationality}</td>
                    <td className="p-3">
                      <span className="pill-tag-shade" style={{ fontSize: '10.5px' }}>{pkg.rent_type}</span>
                    </td>
                    <td className="p-3">{pkg.duration}</td>
                    <td className="p-3 font-mono">{(pkg.price_before_tax ?? 0).toLocaleString()} ⃁</td>
                    <td className="p-3 font-mono text-zinc-500">{(pkg.tax ?? 0).toLocaleString()} ⃁</td>
                    <td className="p-3 font-mono font-bold text-emerald-700">{(pkg.total_price ?? 0).toLocaleString()} ⃁</td>
                    <td className="p-3 font-mono">{pkg.days_count} يوم</td>
                    <td className="p-3">
                      <span className="pill-tag-mint" style={{ fontSize: '10.5px' }}>مفعل وظاهر</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Rent Contract Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in dir-rtl text-right">
          <div className="w-full max-w-xl bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-black text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">إضافة عقد تأجير جديد</h3>
                <p className="text-xs text-zinc-400 mt-0.5">تسجيل بيانات العميل والعاملة والمدة الإيجارية</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                type="button"
                className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1 bg-white text-black">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-700 block mb-1 font-semibold">اسم العميل *</label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
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
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono focus:border-black focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-700 block mb-1 font-semibold">العاملة المطلوبة للتأجير *</label>
                    <input
                      type="text"
                      required
                      value={maidName}
                      onChange={(e) => setMaidName(e.target.value)}
                      placeholder="سيتي نورعيني (سير تأجير نشطة)"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-700 block mb-1 font-semibold">الجنسية *</label>
                    <select
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black focus:border-black focus:outline-none"
                    >
                      <option>إندونيسيا</option>
                      <option>إثيوبيا</option>
                      <option>الفلبين</option>
                      <option>أوغندا</option>
                      <option>كينيا</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-zinc-700 block mb-1 font-semibold">المدة (بالشهور) *</label>
                    <input
                      type="number"
                      required
                      value={durationMonths}
                      onChange={(e) => setDurationMonths(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-mono focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-700 block mb-1 font-semibold">السعر الشهري قبل الضريبة *</label>
                    <input
                      type="number"
                      required
                      value={monthlyCost}
                      onChange={(e) => setMonthlyCost(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-black font-bold focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-700 block mb-1 font-semibold">الإجمالي بعد الضريبة</label>
                    <div className="py-2 px-3 bg-zinc-100 rounded-2xl font-bold font-mono text-emerald-700 text-xs">
                      {totalAmount.toLocaleString()} ⃁
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-end gap-3">
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

      {/* Contract Print Modal */}
      {selectedContractForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in dir-rtl text-right">
          <div className="w-full max-w-2xl bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden p-6">
            <div className="flex justify-between items-center mb-4 border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-black text-base">طباعة عقد التأجير المعتمد</h3>
              <button
                onClick={() => setSelectedContractForPrint(null)}
                className="p-1 rounded-full text-zinc-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <DualBrandingDocumentGenerator
              documentTitle="عقد تقديم خدمات تأجير وتشغيل العمالة المنزلية والمهنية المعتمد"
              documentNumber={selectedContractForPrint.contract_number}
              date={new Date().toISOString().slice(0, 10)}
            >
              <div className="flex flex-col gap-4 text-xs font-sans text-zinc-800">
                {/* Contract Status Banner */}
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-black">نوع الباقة التأجيرية:</span>
                    <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      {selectedContractForPrint.package_name || 'باقة التأجير المرن'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-black">حالة العقد:</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                      {selectedContractForPrint.status} - ساري المفعول
                    </span>
                  </div>
                </div>

                {/* Parties Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* First Party (Lessor Company) */}
                  <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-1.5">
                    <h4 className="font-bold text-xs text-black border-b border-zinc-200 pb-1">
                      الطرف الأول (الشركة المؤجرة والمشغلة)
                    </h4>
                    <div className="flex justify-between"><span className="text-zinc-500">الاسم التجاري:</span><strong className="text-black">مجموعة السليم للتشغيل والتأجير</strong></div>
                    <div className="flex justify-between"><span className="text-zinc-500">رقم ترخيص التأجير:</span><span className="font-mono font-bold text-black">770291</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">السجل التجاري:</span><span className="font-mono font-bold text-black">1010884920</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">الفرع الموثق:</span><span className="font-bold text-black">{selectedContractForPrint.branch || 'الفرع الرئيسي'}</span></div>
                  </div>

                  {/* Second Party (Lessee Client) */}
                  <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-1.5">
                    <h4 className="font-bold text-xs text-black border-b border-zinc-200 pb-1">
                      الطرف الثاني (العميل المستأجر)
                    </h4>
                    <div className="flex justify-between"><span className="text-zinc-500">اسم المستأجر:</span><strong className="text-black">{selectedContractForPrint.client_name}</strong></div>
                    <div className="flex justify-between"><span className="text-zinc-500">الهوية الوطنية / الإقامة:</span><span className="font-mono font-bold text-black">{selectedContractForPrint.client_national_id || '1099201844'}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">رقم الجوال:</span><span className="font-mono font-bold text-black">{selectedContractForPrint.client_phone}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">حالة السداد:</span><span className="font-bold text-emerald-700">{selectedContractForPrint.payment_status}</span></div>
                  </div>
                </div>

                {/* Worker & Rental Duration Details */}
                <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2">
                  <h4 className="font-bold text-xs text-black border-b border-zinc-200 pb-1">
                    بيانات العاملة وفترة التأجير المعتمدة
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                    <div><span className="text-zinc-500 block">اسم العامل/ة:</span><strong className="text-black">{selectedContractForPrint.maid_name}</strong></div>
                    <div><span className="text-zinc-500 block">الجنسية:</span><strong className="text-black">{selectedContractForPrint.nationality}</strong></div>
                    <div><span className="text-zinc-500 block">المهنة:</span><strong className="text-black">خدمات منزلية وضيافة</strong></div>
                    <div><span className="text-zinc-500 block">مدة العقد:</span><strong className="text-black font-mono">{selectedContractForPrint.duration_months} أشهر</strong></div>
                    <div><span className="text-zinc-500 block">تاريخ البدء:</span><span className="font-mono text-black">{selectedContractForPrint.start_date}</span></div>
                    <div><span className="text-zinc-500 block">تاريخ الانتهاء:</span><span className="font-mono text-black">{selectedContractForPrint.end_date}</span></div>
                    <div><span className="text-zinc-500 block">التأمين الصحي:</span><strong className="text-emerald-700 font-bold">مغطى بالكامل (مجلس الضمان)</strong></div>
                    <div><span className="text-zinc-500 block">سياسة الاستبدال:</span><strong className="text-emerald-700 font-bold">استبدال مجاني خلال 48 ساعة</strong></div>
                  </div>
                </div>

                {/* Terms of Rental */}
                <div className="p-3.5 bg-zinc-50/80 rounded-2xl border border-zinc-200 space-y-1 text-[11px] text-zinc-700 leading-relaxed">
                  <h4 className="font-bold text-xs text-black mb-1">شروط والتزامات عقد التأجير:</h4>
                  <p>1. تظل العاملة على كفالة وإشراف الطرف الأول القانوني والمالي طوال فترة سريان العقد.</p>
                  <p>2. يلتزم الطرف الثاني بتوفير بيئة عمل ملائمة وسكن آمن وساعات راحة كافية وفق الأنظمة المرعية في المملكة.</p>
                  <p>3. في حال رغبة العاملة بعدم الاستمرار أو حدوث عارض صحي، تلتزم الشركة باستبدال العاملة خلال 48 ساعة دون رسوم إضافية.</p>
                  <p>4. يحظر تشغيل العاملة لدى غير المستأجر أو خارج النطاق السكني المحدد في هذا العقد.</p>
                </div>

                {/* Financial Table */}
                <div className="overflow-hidden rounded-xl border border-zinc-200">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-zinc-100 text-zinc-700 font-bold">
                      <tr>
                        <th className="p-2.5">الباقة / البيان</th>
                        <th className="p-2.5 text-center">التكلفة الشهرية</th>
                        <th className="p-2.5 text-center">ضريبة القيمة المضافة (15%)</th>
                        <th className="p-2.5 text-left">الإجمالي المستحق</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-zinc-100 font-mono">
                      <tr>
                        <td className="p-2.5 font-sans font-medium text-black">{selectedContractForPrint.package_name || 'باقة التأجير الشهري'} ({selectedContractForPrint.duration_months} شهر)</td>
                        <td className="p-2.5 text-center">{(selectedContractForPrint.monthly_cost ?? 2500).toLocaleString()} ⃁ / شهر</td>
                        <td className="p-2.5 text-center">{(selectedContractForPrint.tax_amount ?? (selectedContractForPrint.total_amount ? Math.round(selectedContractForPrint.total_amount * 0.15 / 1.15) : 375)).toLocaleString()} ⃁</td>
                        <td className="p-2.5 text-left font-bold text-emerald-700">{(selectedContractForPrint.total_amount ?? 2875).toLocaleString()} ⃁</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Signatures & Seal Block */}
                <div className="grid grid-cols-2 gap-6 pt-3 border-t-2 border-zinc-300">
                  <div className="text-center space-y-6">
                    <div className="font-bold text-black text-xs">ختم وتوقيع الطرف الأول (الشركة المؤجرة)</div>
                    <div className="w-24 h-24 mx-auto border-2 border-dashed border-emerald-600/40 rounded-full flex items-center justify-center bg-emerald-50/50">
                      <span className="text-[10px] font-bold text-emerald-800 text-center leading-tight">مجموعة السليم<br />إدارة التشغيل والتأجير<br />معتمد</span>
                    </div>
                  </div>
                  <div className="text-center space-y-6">
                    <div className="font-bold text-black text-xs">توقيع الطرف الثاني (المستأجر)</div>
                    <div className="w-full h-16 border-b-2 border-zinc-400 mt-8 flex items-end justify-center">
                      <span className="text-[11px] text-zinc-400">التوقيع الإلكتروني وتأكيد الاستلام</span>
                    </div>
                  </div>
                </div>
              </div>
            </DualBrandingDocumentGenerator>
          </div>
        </div>
      )}
      {/* Modals for Sub-modules */}

      {/* 1. Add Driver Modal */}
      {showAddDriverModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-black text-base">تسجيل سائق جديد في أسطول التأجير</h3>
              </div>
              <button 
                onClick={() => setShowAddDriverModal(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-black hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDriver} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">اسم السائق الكامل *</label>
                  <input
                    type="text"
                    required
                    placeholder="RAJESH KUMAR"
                    value={driverForm.name}
                    onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                    className="text-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">الجنسية</label>
                  <select
                    value={driverForm.nat}
                    onChange={(e) => setDriverForm({ ...driverForm, nat: e.target.value })}
                    className="text-input w-full"
                  >
                    <option value="الهند">الهند</option>
                    <option value="باكستان">باكستان</option>
                    <option value="بنغلاديش">بنغلاديش</option>
                    <option value="مصر">مصر</option>
                    <option value="الفلبين">الفلبين</option>
                    <option value="السودان">السودان</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">رقم رخصة القيادة</label>
                  <input
                    type="text"
                    placeholder="DL-992810"
                    value={driverForm.lic}
                    onChange={(e) => setDriverForm({ ...driverForm, lic: e.target.value })}
                    className="text-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">حالة الرخصة</label>
                  <select
                    value={driverForm.lic_status}
                    onChange={(e) => setDriverForm({ ...driverForm, lic_status: e.target.value })}
                    className="text-input w-full"
                  >
                    <option value="سارية">سارية</option>
                    <option value="بانتظار التجديد">بانتظار التجديد</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">المركبة المسندة</label>
                  <input
                    type="text"
                    placeholder="تويوتا كامري 2024"
                    value={driverForm.car}
                    onChange={(e) => setDriverForm({ ...driverForm, car: e.target.value })}
                    className="text-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">الراتب الشهري (⃁)</label>
                  <input
                    type="number"
                    value={driverForm.salary}
                    onChange={(e) => setDriverForm({ ...driverForm, salary: e.target.value })}
                    className="text-input w-full"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddDriverModal(false)}
                  className="button-outline-on-light text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs font-bold shadow-md"
                >
                  حفظ وتسجيل السائق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Maid Modal */}
      {showAddMaidModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-black text-base">إضافة عاملة جديدة في قائمة التأجير</h3>
              </div>
              <button 
                onClick={() => setShowAddMaidModal(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-black hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMaid} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">اسم العاملة *</label>
                  <input
                    type="text"
                    required
                    placeholder="SITI NURHALIZA"
                    value={maidForm.name}
                    onChange={(e) => setMaidForm({ ...maidForm, name: e.target.value })}
                    className="text-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">الجنسية</label>
                  <select
                    value={maidForm.nat}
                    onChange={(e) => setMaidForm({ ...maidForm, nat: e.target.value })}
                    className="text-input w-full"
                  >
                    <option value="إندونيسيا">إندونيسيا</option>
                    <option value="الفلبين">الفلبين</option>
                    <option value="إثيوبيا">إثيوبيا</option>
                    <option value="أوغندا">أوغندا</option>
                    <option value="كينيا">كينيا</option>
                    <option value="سريلانكا">سريلانكا</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">رقم الإقامة أو الجواز</label>
                  <input
                    type="text"
                    placeholder="IQ-22910481"
                    value={maidForm.pass}
                    onChange={(e) => setMaidForm({ ...maidForm, pass: e.target.value })}
                    className="text-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">سعر التأجير الشهري (⃁)</label>
                  <input
                    type="number"
                    value={maidForm.price}
                    onChange={(e) => setMaidForm({ ...maidForm, price: e.target.value })}
                    className="text-input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-600 font-bold mb-1">المهنة والمهارات</label>
                <input
                  type="text"
                  placeholder="عاملة منزلية شاملة + طبخ سعودي + غسيل"
                  value={maidForm.skill}
                  onChange={(e) => setMaidForm({ ...maidForm, skill: e.target.value })}
                  className="text-input w-full"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddMaidModal(false)}
                  className="button-outline-on-light text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs font-bold shadow-md"
                >
                  حفظ وإضافة العاملة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add Package Modal */}
      {showAddPackageModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-black text-base">إضافة باقة تأجير جديدة</h3>
              </div>
              <button 
                onClick={() => setShowAddPackageModal(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-black hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPackage} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block text-zinc-600 font-bold mb-1">عنوان الباقة *</label>
                <input
                  type="text"
                  required
                  placeholder="باقة الستة أشهر - عمالة كينية ممتازة"
                  value={packageForm.title}
                  onChange={(e) => setPackageForm({ ...packageForm, title: e.target.value })}
                  className="text-input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">الجنسية المخصصة</label>
                  <select
                    value={packageForm.nationality}
                    onChange={(e) => setPackageForm({ ...packageForm, nationality: e.target.value })}
                    className="text-input w-full"
                  >
                    <option value="إندونيسيا">إندونيسيا</option>
                    <option value="الفلبين">الفلبين</option>
                    <option value="إثيوبيا">إثيوبيا</option>
                    <option value="كينيا">كينيا</option>
                    <option value="أوغندا">أوغندا</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">نوع التأجير</label>
                  <select
                    value={packageForm.rent_type}
                    onChange={(e) => setPackageForm({ ...packageForm, rent_type: e.target.value })}
                    className="text-input w-full"
                  >
                    <option value="شهري">شهري</option>
                    <option value="3 أشهر">3 أشهر</option>
                    <option value="6 أشهر">6 أشهر</option>
                    <option value="سنوي">سنوي</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">السعر الأساسي قبل الضريبة (⃁)</label>
                  <input
                    type="number"
                    required
                    value={packageForm.price_before_tax}
                    onChange={(e) => setPackageForm({ ...packageForm, price_before_tax: e.target.value })}
                    className="text-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">عدد الأيام</label>
                  <input
                    type="number"
                    value={packageForm.days_count}
                    onChange={(e) => setPackageForm({ ...packageForm, days_count: e.target.value })}
                    className="text-input w-full"
                  />
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-500">ضريبة القيمة المضافة المحسوبة (15%):</span>
                  <span className="font-mono font-bold text-black">{((parseFloat(packageForm.price_before_tax) || 0) * 0.15).toLocaleString()} ⃁</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-800">
                  <span>الإجمالي شامل الضريبة:</span>
                  <span className="font-mono">{((parseFloat(packageForm.price_before_tax) || 0) * 1.15).toLocaleString()} ⃁</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddPackageModal(false)}
                  className="button-outline-on-light text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs font-bold shadow-md"
                >
                  إضافة الباقة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentContractsPage;
