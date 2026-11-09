import React, { useState, useEffect } from 'react';
import { ExternalOffice } from '../types';
import { useCompany } from '../contexts/CompanyContext';
import { exportData } from '../services/exportService';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { Badge } from '../components/ui/Badge';
import {
  Globe,
  Building2,
  Users,
  FolderOpen,
  FileSpreadsheet,
  Download,
  Phone,
  Mail,
  UserCheck,
  ShieldCheck,
  Plus,
  X,
  UploadCloud,
  FileText
} from 'lucide-react';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';

export interface OfficeUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  linked_office: string;
  nationality: string;
  status: 'نشط' | 'معلق';
}

export interface OfficeFile {
  id: string;
  office_name: string;
  file_title: string;
  file_type: string;
  upload_date: string;
  file_size: string;
}

const INITIAL_OFFICES: ExternalOffice[] = [
  {
    id: 'OFF-PH-01',
    officeName: 'Manila Overseas Placement Agency',
    country: 'الفلبين',
    countryCode: 'PH',
    managerName: 'Maria Santos',
    phone: '+63281234567',
    email: 'info@manilaagency.ph',
    licenseNumber: 'POEA-2024-9981',
    activeCandidatesCount: 140,
    arrivedCountCount: 820,
    rating: 4.9,
    authorizedCompanies: ['SAF', 'TOP'],
  },
  {
    id: 'OFF-ET-02',
    officeName: 'Addis International Recruitment Bureau',
    country: 'إثيوبيا',
    countryCode: 'ET',
    managerName: 'Bekele Tadesse',
    phone: '+251115512345',
    email: 'contact@addisbureau.et',
    licenseNumber: 'ETH-MOL-7741',
    activeCandidatesCount: 95,
    arrivedCountCount: 540,
    rating: 4.7,
    authorizedCompanies: ['YAQ', 'KAS'],
  },
  {
    id: 'OFF-IN-03',
    officeName: 'Bombay Professional Manpower Services',
    country: 'الهند',
    countryCode: 'IN',
    managerName: 'Rajesh Sharma',
    phone: '+912261234567',
    email: 'mumbai@manpower.in',
    licenseNumber: 'MEA-IND-3321',
    activeCandidatesCount: 210,
    arrivedCountCount: 1100,
    rating: 4.8,
    authorizedCompanies: ['SAF', 'YAQ', 'TOP', 'KAS'],
  },
];

const INITIAL_OFFICE_USERS: OfficeUser[] = [
  {
    id: 'OU-01',
    name: 'عبدالفتح (مسؤول الوكلاء)',
    phone: '+966558025628',
    email: 'abdelftah@alsulaim-group.com',
    linked_office: 'Manila Overseas Placement Agency',
    nationality: 'الفلبين',
    status: 'نشط',
  },
  {
    id: 'OU-02',
    name: 'Bekele Tadesse',
    phone: '+251115512345',
    email: 'bekele@addisbureau.et',
    linked_office: 'Addis International Recruitment Bureau',
    nationality: 'إثيوبيا',
    status: 'نشط',
  },
];

const INITIAL_OFFICE_FILES: OfficeFile[] = [
  {
    id: 'OF-01',
    office_name: 'Manila Overseas Placement Agency',
    file_title: 'ترخيص وزارة العمل الفلبينية POEA ساري',
    file_type: 'PDF',
    upload_date: '2026-01-10',
    file_size: '2.4 MB',
  },
  {
    id: 'OF-02',
    office_name: 'Addis International Recruitment Bureau',
    file_title: 'عقد الشراكة والإرساليات المعتمد مع شركة السليم',
    file_type: 'PDF',
    upload_date: '2026-02-15',
    file_size: '4.1 MB',
  },
];

export const ExternalOfficesAgentsPage: React.FC = () => {
  const { activeCompany } = useCompany();
  const { addNotification } = useAppStore();

  // Database Persistent State
  const [offices, setOffices] = useState<ExternalOffice[]>([]);
  const [officeUsers, setOfficeUsers] = useState<OfficeUser[]>([]);
  const [officeFiles, setOfficeFiles] = useState<OfficeFile[]>([]);
  const [activeTab, setActiveTab] = useState<'offices' | 'users' | 'files'>('offices');

  // Modals
  const [showAddOfficeModal, setShowAddOfficeModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddFileModal, setShowAddFileModal] = useState(false);

  const [officeForm, setOfficeForm] = useState<{
    officeName: string;
    country: ExternalOffice['country'];
    countryCode: string;
    managerName: string;
    phone: string;
    email: string;
    licenseNumber: string;
    activeCandidatesCount: string;
  }>({
    officeName: '',
    country: 'الفلبين',
    countryCode: 'PH',
    managerName: '',
    phone: '',
    email: '',
    licenseNumber: '',
    activeCandidatesCount: '25'
  });

  const [userForm, setUserForm] = useState({
    name: '',
    phone: '',
    email: '',
    linked_office: '',
    nationality: 'الفلبين'
  });

  const [fileForm, setFileForm] = useState({
    office_name: '',
    file_title: '',
    file_type: 'PDF'
  });

  // Load from realErpDataStore
  useEffect(() => {
    realErpDataStore.getRecords<ExternalOffice>('external_recruitment_offices', INITIAL_OFFICES).then(data => {
      setOffices(data);
      if (data.length > 0) {
        if (!userForm.linked_office) setUserForm(prev => ({ ...prev, linked_office: data[0].officeName }));
        if (!fileForm.office_name) setFileForm(prev => ({ ...prev, office_name: data[0].officeName }));
      }
    });
    realErpDataStore.getRecords<OfficeUser>('external_office_users', INITIAL_OFFICE_USERS).then(setOfficeUsers);
    realErpDataStore.getRecords<OfficeFile>('external_office_files', INITIAL_OFFICE_FILES).then(setOfficeFiles);
  }, []);

  // Save Office
  const handleSaveOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officeForm.officeName.trim()) return;

    const count = Number(officeForm.activeCandidatesCount) || 0;
    const newOffice: ExternalOffice = {
      id: `OFF-${Date.now().toString().slice(-4)}`,
      officeName: officeForm.officeName.trim(),
      country: officeForm.country,
      countryCode: officeForm.countryCode,
      managerName: officeForm.managerName.trim() || 'المدير المسؤول',
      phone: officeForm.phone.trim() || '+0000000000',
      email: officeForm.email.trim() || 'agency@international.com',
      licenseNumber: officeForm.licenseNumber.trim() || `LIC-${Date.now().toString().slice(-4)}`,
      activeCandidatesCount: count,
      arrivedCountCount: 0,
      rating: 5.0,
      authorizedCompanies: ['SAF', 'TOP', 'YAQ', 'KAS']
    };

    const updated = await realErpDataStore.addRecord<ExternalOffice>('external_recruitment_offices', newOffice, INITIAL_OFFICES);
    setOffices(updated);

    // Cross-sync with offices table
    await realErpDataStore.addRecord('offices', {
      id: newOffice.id,
      name: newOffice.officeName,
      manager: newOffice.managerName,
      nationality: newOffice.country,
      license_no: newOffice.licenseNumber,
      account_code: `221${Date.now().toString().slice(-2)}`,
      phone: newOffice.phone,
      email: newOffice.email,
      cvs_count: newOffice.activeCandidatesCount,
      contracts_count: 0,
      cost_usd: 1200,
      commission_sar: 4500,
      balance_usd: 0,
      status: 'نشط',
    });
    setShowAddOfficeModal(false);
    setOfficeForm({
      officeName: '',
      country: 'الفلبين',
      countryCode: 'PH',
      managerName: '',
      phone: '',
      email: '',
      licenseNumber: '',
      activeCandidatesCount: '25'
    });

    addNotification({
      title: 'إضافة وكالة خارجية',
      message: `تم تسجيل الوكالة (${newOffice.officeName}) في شبكة الاستقدام الدولية وحفظها بنجاح.`,
      type: 'success'
    });
  };

  // Save User
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name.trim()) return;

    const selectedOffice = userForm.linked_office || (offices.length > 0 ? offices[0].officeName : 'وكالة معتمدة');
    const newUser: OfficeUser = {
      id: `OU-${Date.now().toString().slice(-4)}`,
      name: userForm.name.trim(),
      phone: userForm.phone.trim() || '+966500000000',
      email: userForm.email.trim() || 'agent@alsulaim-group.com',
      linked_office: selectedOffice,
      nationality: userForm.nationality,
      status: 'نشط'
    };

    const updated = await realErpDataStore.addRecord<OfficeUser>('external_office_users', newUser, INITIAL_OFFICE_USERS);
    setOfficeUsers(updated);
    setShowAddUserModal(false);
    setUserForm({
      name: '',
      phone: '',
      email: '',
      linked_office: offices.length > 0 ? offices[0].officeName : '',
      nationality: 'الفلبين'
    });

    addNotification({
      title: 'إضافة مستخدم وكيل',
      message: `تم إنشاء حساب المستخدم (${newUser.name}) وربطه بالمكتب (${newUser.linked_office}) بنجاح.`,
      type: 'success'
    });
  };

  // Save File
  const handleSaveFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileForm.file_title.trim()) return;

    const selectedOffice = fileForm.office_name || (offices.length > 0 ? offices[0].officeName : 'وكالة معتمدة');
    const newFile: OfficeFile = {
      id: `OF-${Date.now().toString().slice(-4)}`,
      office_name: selectedOffice,
      file_title: fileForm.file_title.trim(),
      file_type: fileForm.file_type,
      upload_date: new Date().toISOString().slice(0, 10),
      file_size: '3.2 MB'
    };

    const updated = await realErpDataStore.addRecord<OfficeFile>('external_office_files', newFile, INITIAL_OFFICE_FILES);
    setOfficeFiles(updated);
    setShowAddFileModal(false);
    setFileForm({
      office_name: offices.length > 0 ? offices[0].officeName : '',
      file_title: '',
      file_type: 'PDF'
    });

    addNotification({
      title: 'رفع وثيقة وترخيص',
      message: `تم رفع وتوثيق المستند (${newFile.file_title}) للمكتب (${newFile.office_name}) بنجاح.`,
      type: 'success'
    });
  };

  // Handle Download File
  const handleDownloadFile = (f: OfficeFile) => {
    const fileContent = `مجموعة شركات خالد السليم القابضة\nمركز إدارة الوكلاء والمكاتب الخارجية المعتمدة\n\nاسم المكتب: ${f.office_name}\nعنوان الوثيقة: ${f.file_title}\nنوع الملف: ${f.file_type}\nتاريخ التوثيق والرفع: ${f.upload_date}\nحجم الملف: ${f.file_size}\nالحالة: وثيقة معتمدة ومطابقة لضوابط وزارة الموارد البشرية ومنصة مساند.\n`;
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${f.file_title.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    addNotification({
      title: 'تحميل الوثيقة',
      message: `تم تحميل ملف (${f.file_title}) بنجاح.`,
      type: 'success',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div
        className="card-feature-cinematic"
        style={{
          backgroundColor: '#141414',
          borderRadius: '16px',
          padding: '28px',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        }}
      >
        <div className="flex items-center gap-3">
          <BusinessIllustration type="foreign-agencies" size="sm" />
          <div style={{ width: '44px', height: '44px', borderRadius: '9999px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
                INTERNATIONAL RECRUITMENT NETWORK
              </span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, margin: 0, letterSpacing: '-0.02em', color: '#ffffff', fontFamily: 'var(--font-family-display)' }}>
              بوابة المكاتب والوكلاء الخارجيين المعتمدين
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#a1a1aa', fontWeight: 420 }}>
              الربط المباشر مع مكاتب الفلبين، إثيوبيا، الهند، كينيا، وأوغندا وإدارة الوثائق والتراخيص بقاعدة البيانات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowAddOfficeModal(true)}
            className="button-white-pill"
            style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px' }}
          >
            <Plus className="w-4 h-4 ml-1 text-[#141414]" />
            <span>إضافة وكالة</span>
          </button>
          <button
            onClick={() => setShowAddUserModal(true)}
            className="button-white-pill"
            style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px' }}
          >
            <Users className="w-4 h-4 ml-1 text-[#141414]" />
            <span>إضافة مستخدم</span>
          </button>
          <button
            onClick={() => setShowAddFileModal(true)}
            className="button-white-pill"
            style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px' }}
          >
            <UploadCloud className="w-4 h-4 ml-1 text-[#141414]" />
            <span>رفع وثيقة</span>
          </button>
          <button
            onClick={() => exportData('external_offices', offices, 'excel', `المكاتب الخارجية - ${activeCompany ? activeCompany.name : 'المجموعة'}`)}
            className="button-white-pill"
            style={{ fontSize: '12px', padding: '6px 16px', minHeight: '38px' }}
          >
            <FileSpreadsheet className="w-4 h-4 ml-1 text-[#141414]" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
        {[
          { id: 'offices', label: `المكاتب والوكالات الخارجية (${offices.length})`, icon: Building2 },
          { id: 'users', label: `مستخدمي الوكلاء (${officeUsers.length})`, icon: Users },
          { id: 'files', label: `ملفات ووثائق الوكلاء (${officeFiles.length})`, icon: FolderOpen },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
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
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Offices Cards & Grid */}
      {activeTab === 'offices' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#707070] font-semibold">عدد الوكالات المعتمدة: {offices.length} وكالة دولية</span>
            <button
              onClick={() => setShowAddOfficeModal(true)}
              className="button-primary-pill text-xs py-1.5 px-4"
            >
              <Plus className="w-3.5 h-3.5 ml-1" />
              <span>+ إضافة وكالة خارجية</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {offices.map((office) => (
              <div
                key={office.id}
                className="card-pricing hover:border-[#141414] transition-colors"
                style={{
                  borderRadius: '24px',
                  background: '#ffffff',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2.5">
                      <CorporateAvatar name={office.managerName} role={office.officeName} size="sm" status="verified" />
                      <h2 className="font-bold text-[#141414] text-base">{office.officeName}</h2>
                    </div>
                    <Badge text={office.country} type="purple" />
                  </div>

                  <div className="text-xs text-zinc-600 space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#707070]" />
                      <span>الترخيص: <strong className="font-mono text-[#141414]">{office.licenseNumber}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-[#707070]" />
                      <span>المدير: <strong className="text-[#141414]">{office.managerName}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#707070]" />
                      <span className="font-mono">{office.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#707070]" />
                      <span>{office.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between border-t border-zinc-100 pt-3 text-xs bg-zinc-50 -mx-6 -mb-6 p-4 rounded-b-3xl">
                  <div>السير المتاحة: <strong className="text-[#141414] font-mono font-bold">{office.activeCandidatesCount}</strong></div>
                  <div>العمالة الواصلة: <strong className="text-[#141414] font-mono font-bold">{office.arrivedCountCount}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Users */}
      {activeTab === 'users' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#141414] m-0">مستخدمي الوكلاء والمكاتب الخارجية ({officeUsers.length})</h3>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="button-primary-pill text-xs py-1.5 px-4"
            >
              <Plus className="w-3.5 h-3.5 ml-1" />
              <span>+ إضافة مستخدم وكيل</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">اسم المستخدم</th>
                  <th className="p-3.5">بيانات التواصل</th>
                  <th className="p-3.5">المكتب المرتبط</th>
                  <th className="p-3.5">الدولة والجنسية</th>
                  <th className="p-3.5">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {officeUsers.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-bold font-mono text-[#141414]">{idx + 1}</td>
                    <td className="p-3.5 font-bold text-[#141414]">
                      <div className="flex items-center gap-2">
                        <CorporateAvatar name={u.name} role={u.linked_office} size="sm" />
                        <span>{u.name}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-mono">{u.phone}</div>
                      <div className="text-[11px] text-[#707070]">{u.email}</div>
                    </td>
                    <td className="p-3.5 font-semibold text-[#141414]">{u.linked_office}</td>
                    <td className="p-3.5 text-zinc-600">{u.nationality}</td>
                    <td className="p-3.5"><Badge text={u.status} type="success" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Files */}
      {activeTab === 'files' && (
        <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
          <div className="p-4 border-b border-zinc-100 bg-white flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#141414] m-0">وثائق وتراخيص المكاتب الخارجية ({officeFiles.length})</h3>
            <button
              onClick={() => setShowAddFileModal(true)}
              className="button-primary-pill text-xs py-1.5 px-4"
            >
              <UploadCloud className="w-3.5 h-3.5 ml-1" />
              <span>+ رفع وثيقة ترخيص</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">المكتب الخارجي</th>
                  <th className="p-3.5">عنوان الوثيقة والملف</th>
                  <th className="p-3.5">نوع الملف</th>
                  <th className="p-3.5">تاريخ الرفع</th>
                  <th className="p-3.5">الحجم</th>
                  <th className="p-3.5 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {officeFiles.map((f, idx) => (
                  <tr key={f.id} className="hover:bg-zinc-50">
                    <td className="p-3.5 font-bold font-mono text-[#141414]">{idx + 1}</td>
                    <td className="p-3.5 font-bold text-[#141414]">{f.office_name}</td>
                    <td className="p-3.5 font-semibold text-zinc-800">{f.file_title}</td>
                    <td className="p-3.5"><Badge text={f.file_type} type="purple" /></td>
                    <td className="p-3.5 font-mono text-[#707070]">{f.upload_date}</td>
                    <td className="p-3.5 font-mono">{f.file_size}</td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleDownloadFile(f)}
                        className="button-outline-on-light"
                        style={{ padding: '4px 12px', fontSize: '11px', minHeight: '28px' }}
                      >
                        <Download className="w-3.5 h-3.5 ml-1" />
                        <span>تحميل</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Add Office */}
      {showAddOfficeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-zinc-200 font-sans">
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-[#141414] m-0">تسجيل وكالة / مكتب خارجي معتمد</h3>
              <button onClick={() => setShowAddOfficeModal(false)} className="text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveOffice} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">اسم الوكالة / المكتب بالكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: Nile International Bureau"
                  value={officeForm.officeName}
                  onChange={e => setOfficeForm({ ...officeForm, officeName: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">الدولة</label>
                  <select
                    value={officeForm.country}
                    onChange={e => {
                      const c = e.target.value as ExternalOffice['country'];
                      let code = 'PH';
                      if (c === 'إثيوبيا') code = 'ET';
                      else if (c === 'الهند') code = 'IN';
                      else if (c === 'كينيا') code = 'KE';
                      else if (c === 'أوغندا') code = 'UG';
                      setOfficeForm({ ...officeForm, country: c, countryCode: code });
                    }}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="الفلبين">الفلبين</option>
                    <option value="إثيوبيا">إثيوبيا</option>
                    <option value="الهند">الهند</option>
                    <option value="كينيا">كينيا</option>
                    <option value="أوغندا">أوغندا</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">رقم الترخيص الوزاري *</label>
                  <input
                    type="text"
                    required
                    placeholder="POEA-2026-..."
                    value={officeForm.licenseNumber}
                    onChange={e => setOfficeForm({ ...officeForm, licenseNumber: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">اسم المدير المسؤول</label>
                  <input
                    type="text"
                    placeholder="اسم مدير المكتب..."
                    value={officeForm.managerName}
                    onChange={e => setOfficeForm({ ...officeForm, managerName: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">عدد السير الجاهزة</label>
                  <input
                    type="number"
                    value={officeForm.activeCandidatesCount}
                    onChange={e => setOfficeForm({ ...officeForm, activeCandidatesCount: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-[#141414] font-bold focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">الهاتف الدولي</label>
                  <input
                    type="text"
                    placeholder="+..."
                    value={officeForm.phone}
                    onChange={e => setOfficeForm({ ...officeForm, phone: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    placeholder="agency@..."
                    value={officeForm.email}
                    onChange={e => setOfficeForm({ ...officeForm, email: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddOfficeModal(false)}
                  className="button-outline-on-light text-xs py-1.5 px-4"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs py-1.5 px-5"
                >
                  حفظ الوكالة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add User */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-zinc-200 font-sans">
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-[#141414] m-0">إضافة مستخدم وكيل خارجي</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">اسم المستخدم بالكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: John Dela Cruz"
                  value={userForm.name}
                  onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">المكتب المرتبط</label>
                <select
                  value={userForm.linked_office}
                  onChange={e => setUserForm({ ...userForm, linked_office: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  {offices.map(o => (
                    <option key={o.id} value={o.officeName}>{o.officeName} ({o.country})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">رقم الجوال *</label>
                  <input
                    type="text"
                    required
                    placeholder="+..."
                    value={userForm.phone}
                    onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    required
                    placeholder="user@agency.com"
                    value={userForm.email}
                    onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="button-outline-on-light text-xs py-1.5 px-4"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs py-1.5 px-5"
                >
                  حفظ المستخدم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add File */}
      {showAddFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-zinc-200 font-sans">
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-[#141414] m-0">رفع وثيقة أو ترخيص معتمد للمكتب</h3>
              <button onClick={() => setShowAddFileModal(false)} className="text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveFile} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">المكتب الخارجي</label>
                <select
                  value={fileForm.office_name}
                  onChange={e => setFileForm({ ...fileForm, office_name: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  {offices.map(o => (
                    <option key={o.id} value={o.officeName}>{o.officeName} ({o.country})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">عنوان الوثيقة أو الترخيص *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ترخيص وزارة العمل السنوي 2026"
                  value={fileForm.file_title}
                  onChange={e => setFileForm({ ...fileForm, file_title: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">نوع الملف</label>
                <select
                  value={fileForm.file_type}
                  onChange={e => setFileForm({ ...fileForm, file_type: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  <option value="PDF">مستند PDF رقمي</option>
                  <option value="Image (JPG/PNG)">صورة ترخيص رسمية</option>
                  <option value="DOCX">ملف وورد تعاقدي</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddFileModal(false)}
                  className="button-outline-on-light text-xs py-1.5 px-4"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="button-primary-pill text-xs py-1.5 px-5"
                >
                  رفع وتوثيق الوثيقة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExternalOfficesAgentsPage;
