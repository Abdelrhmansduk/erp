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
import {
  resolveCanonicalAgency,
  loadUnifiedAgencies,
  loadExternalAgencyAccounts,
  upsertUnifiedAgency,
  provisionExternalAgencyAccount,
  dispatchViaEmailAndWhatsApp,
} from '../services/externalAgencyMasterService';

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
  expiry_date?: string;
  file_name?: string;
  file_data_url?: string;
}

const INITIAL_OFFICES: ExternalOffice[] = [];

const INITIAL_OFFICE_USERS: OfficeUser[] = [];

const INITIAL_OFFICE_FILES: OfficeFile[] = [];

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
    file_type: 'PDF',
    expiry_date: '2027-06-30',
    file_name: '',
    file_size: '',
    file_data_url: '',
  });

  // Load merged unified agencies + legacy offices, portal users, and real license files
  useEffect(() => {
    Promise.all([
      realErpDataStore.getRecords<ExternalOffice>('external_recruitment_offices', INITIAL_OFFICES),
      loadUnifiedAgencies(),
      loadExternalAgencyAccounts(),
      realErpDataStore.getRecords<OfficeUser>('external_office_users', INITIAL_OFFICE_USERS),
    ]).then(([storedOffices, canonicalAgencies, portalAccounts, storedUsers]) => {
      const mergedMap = new Map<string, ExternalOffice>();
      storedOffices.forEach((o) => mergedMap.set(o.officeName.trim().toLowerCase(), o));
      canonicalAgencies.forEach((ag) => {
        const keyAr = ag.name_ar.trim().toLowerCase();
        const keyEn = ag.name_en.trim().toLowerCase();
        if (mergedMap.has(keyAr) || mergedMap.has(keyEn)) return;
        mergedMap.set(keyEn || ag.id, {
          id: ag.id,
          officeName: ag.name_ar || ag.name_en,
          country: (ag.country as ExternalOffice['country']) || 'إثيوبيا',
          countryCode: ag.country_code || 'INT',
          managerName: ag.manager_name || ag.assigned_coordinator_name || 'المدير المسؤول',
          phone: ag.phone || '—',
          email: ag.email || '—',
          licenseNumber: ag.musaned_license_no || ag.license_no || ag.canonical_code,
          activeCandidatesCount: ag.historical_total_contracts || 0,
          arrivedCountCount: ag.historical_arrived_count || 0,
          rating: Number(((ag.quality_score || 90) / 20).toFixed(1)),
          authorizedCompanies: ag.supported_companies || ag.authorized_companies || ['SAF'],
        });
      });
      const finalOffices = Array.from(mergedMap.values());
      setOffices(finalOffices);
      if (finalOffices.length > 0) {
        if (!userForm.linked_office) setUserForm(prev => ({ ...prev, linked_office: finalOffices[0].officeName }));
        if (!fileForm.office_name) setFileForm(prev => ({ ...prev, office_name: finalOffices[0].officeName }));
      }

      const userMap = new Map<string, OfficeUser>();
      storedUsers.forEach((u) => userMap.set(u.email.toLowerCase(), u));
      portalAccounts.forEach((acc) => {
        if (!userMap.has(acc.email.toLowerCase())) {
          userMap.set(acc.email.toLowerCase(), {
            id: acc.id,
            name: acc.contact_person || acc.agency_name_ar,
            phone: acc.phone || acc.whatsapp || '—',
            email: acc.email,
            linked_office: acc.agency_name_ar || acc.agency_name,
            nationality: acc.country,
            status: acc.status === 'نشط' ? 'نشط' : 'معلق',
          });
        }
      });
      setOfficeUsers(Array.from(userMap.values()));
    });

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

    // Provision real isolated External Agency Portal Account from Unified Agent Master + dispatch via Email & WhatsApp
    let canonicalAg = resolveCanonicalAgency(selectedOffice);
    if (!canonicalAg) {
      canonicalAg = await upsertUnifiedAgency({
        company_id: 'SAF',
        canonical_code: `EXT_${Date.now().toString().slice(-4)}`,
        name_en: selectedOffice,
        name_ar: selectedOffice,
        country: newUser.nationality,
        country_code: 'INT',
        license_no: 'LIC-INT',
        manager_name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        whatsapp: newUser.phone,
        aliases: [selectedOffice],
        authorized_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
        assigned_coordinator_email: 'i.mahmoud.followup@kas.sa',
        assigned_coordinator_name: 'إسلام أحمد عرفة',
        default_commission_usd: 1050,
        sla_assign_days: 10,
        avg_days_to_assign: 8,
        avg_days_to_arrival: 35,
        historical_total_contracts: 0,
        historical_arrived_count: 0,
        historical_backout_count: 0,
        historical_runaway_count: 0,
        historical_cancelled_count: 0,
        quality_score: 92,
        status: 'نشط',
      });
    }
    const provisioned = await provisionExternalAgencyAccount({
      agencyId: canonicalAg.id,
      email: newUser.email,
      contactPerson: newUser.name,
    });
    await dispatchViaEmailAndWhatsApp({
      recipientName: `${newUser.name} (${selectedOffice})`,
      recipientPhone: newUser.phone,
      recipientEmail: provisioned.account.email,
      subject: `بيانات الدخول الرسمية لبوابة الوكلاء — ${selectedOffice}`,
      bodyText: `مرحباً (${newUser.name}),\nتم تفعيل حسابكم المعزول على بوابة الوكلاء الخارجيين:\nالبريد: ${provisioned.account.email}\nاسم المستخدم: ${provisioned.account.username}\nكلمة المرور المشفرة: ${provisioned.generatedPassword}`,
      channel: 'both',
      templateName: 'تفعيل حساب مستخدم وكيل خارجي',
      companyId: 'SAF',
      openExternalClient: false,
    });

    setShowAddUserModal(false);
    setUserForm({
      name: '',
      phone: '',
      email: '',
      linked_office: offices.length > 0 ? offices[0].officeName : '',
      nationality: 'الفلبين'
    });

    addNotification({
      title: 'تفعيل حساب بوابة الوكيل وإرسال البيانات',
      message: `تم إنشاء الحساب المعزول للمستخدم (${newUser.name}) على وكالة (${newUser.linked_office}) وإرسال بيانات الدخول عبر البريد الإلكتروني والواتساب.`,
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
      file_size: fileForm.file_size || '1.1 MB',
      expiry_date: fileForm.expiry_date || undefined,
      file_name: fileForm.file_name || undefined,
      file_data_url: fileForm.file_data_url || undefined,
    };

    const updated = await realErpDataStore.addRecord<OfficeFile>('external_office_files', newFile, INITIAL_OFFICE_FILES);
    setOfficeFiles(updated);
    setShowAddFileModal(false);
    setFileForm({
      office_name: offices.length > 0 ? offices[0].officeName : '',
      file_title: '',
      file_type: 'PDF',
      expiry_date: '2027-06-30',
      file_name: '',
      file_size: '',
      file_data_url: '',
    });

    addNotification({
      title: 'رفع وثيقة وترخيص',
      message: `تم رفع وتوثيق المستند (${newFile.file_title}) للمكتب (${newFile.office_name}) بنجاح.`,
      type: 'success'
    });
  };

  // Handle Download File
  const handleDownloadFile = (f: OfficeFile) => {
    if (f.file_data_url) {
      const link = document.createElement('a');
      link.href = f.file_data_url;
      link.download = f.file_name || `${f.file_title.replace(/\s+/g, '_')}.pdf`;
      link.click();
      addNotification({
        title: 'تحميل الوثيقة الأصلية',
        message: `تم تحميل الملف (${f.file_name || f.file_title}) بنجاح.`,
        type: 'success',
      });
      return;
    }

    const fileContent = `مجموعة شركات خالد السليم القابضة\nمركز إدارة الوكلاء والمكاتب الخارجية المعتمدة\n\nاسم المكتب: ${f.office_name}\nعنوان الوثيقة: ${f.file_title}\nنوع الملف: ${f.file_type}\nتاريخ التوثيق والرفع: ${f.upload_date}\nتاريخ الانتهاء: ${f.expiry_date || 'غير محدد'}\nحجم الملف: ${f.file_size}\nالحالة: وثيقة معتمدة ومطابقة لضوابط وزارة الموارد البشرية ومنصة مساند.\n`;
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${f.file_title.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    addNotification({
      title: 'تحميل الوثيقة',
      message: `تم تحميل سجل وثيقة (${f.file_title}) بنجاح.`,
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
          color: '#ffffff',
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
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#adadad', fontWeight: 420 }}>
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
      <div className="flex flex-wrap gap-2 border-b border-[#e0e0e0] pb-3">
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
                borderColor: isActive ? '#141414' : '#e0e0e0',
                backgroundColor: isActive ? '#141414' : '#ffffff',
                color: isActive ? '#ffffff' : '#141414',
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

                  <div className="text-xs text-[#707070] space-y-2 mb-4">
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

                <div className="flex justify-between border-t border-[#e0e0e0] pt-3 text-xs bg-[#f3f3f3] -mx-6 -mb-6 p-4 rounded-b-3xl">
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
          <div className="p-4 border-b border-[#e0e0e0] bg-white flex items-center justify-between">
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
            <table className="w-full text-right text-xs text-[#141414]">
              <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">اسم المستخدم</th>
                  <th className="p-3.5">بيانات التواصل</th>
                  <th className="p-3.5">المكتب المرتبط</th>
                  <th className="p-3.5">الدولة والجنسية</th>
                  <th className="p-3.5">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {officeUsers.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-[#f3f3f3]">
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
                    <td className="p-3.5 text-[#707070]">{u.nationality}</td>
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
          <div className="p-4 border-b border-[#e0e0e0] bg-white flex items-center justify-between">
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
            <table className="w-full text-right text-xs text-[#141414]">
              <thead className="bg-[#f3f3f3] text-[#141414] font-bold border-b border-[#e0e0e0]">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">المكتب الخارجي</th>
                  <th className="p-3.5">عنوان الوثيقة والملف</th>
                  <th className="p-3.5">نوع الملف</th>
                  <th className="p-3.5">تاريخ الرفع</th>
                  <th className="p-3.5">انتهاء الترخيص</th>
                  <th className="p-3.5">الحجم</th>
                  <th className="p-3.5 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {officeFiles.map((f, idx) => {
                  const todayIso = new Date().toISOString().slice(0, 10);
                  const daysLeft = f.expiry_date
                    ? Math.round(
                        (new Date(`${f.expiry_date}T00:00:00Z`).getTime() -
                          new Date(`${todayIso}T00:00:00Z`).getTime()) /
                          86_400_000
                      )
                    : null;
                  return (
                  <tr key={f.id} className="hover:bg-[#f3f3f3]">
                    <td className="p-3.5 font-bold font-mono text-[#141414]">{idx + 1}</td>
                    <td className="p-3.5 font-bold text-[#141414]">{f.office_name}</td>
                    <td className="p-3.5 font-semibold text-[#141414]">
                      <div>{f.file_title}</div>
                      {f.file_name && <div className="text-[10.5px] font-mono text-[#707070]">{f.file_name}</div>}
                    </td>
                    <td className="p-3.5"><Badge text={f.file_type} type="purple" /></td>
                    <td className="p-3.5 font-mono text-[#707070]">{f.upload_date}</td>
                    <td className="p-3.5 font-mono">
                      {f.expiry_date ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{f.expiry_date}</span>
                          {daysLeft !== null && daysLeft <= 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-[#141414] text-[#ffffff] font-sans text-[10px] font-bold">
                              منتهي
                            </span>
                          ) : daysLeft !== null && daysLeft <= 60 ? (
                            <span className="px-2 py-0.5 rounded-full bg-[#e0e0e0] text-[#141414] font-sans text-[10px] font-bold">
                              باقي {daysLeft}ي
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] font-sans text-[10px] font-bold">
                              ساري
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#707070]">—</span>
                      )}
                    </td>
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
                )})}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Add Office */}
      {showAddOfficeModal && (
        <div role="dialog" aria-modal="true" onClick={() => setShowAddOfficeModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[24px] p-6 w-full max-w-lg border border-[#e0e0e0] font-sans max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-[#e0e0e0]">
              <h3 className="text-sm font-bold text-[#141414] m-0">تسجيل وكالة / مكتب خارجي معتمد</h3>
              <button onClick={() => setShowAddOfficeModal(false)} className="text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveOffice} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#141414] block mb-1">اسم الوكالة / المكتب بالكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: Nile International Bureau"
                  value={officeForm.officeName}
                  onChange={e => setOfficeForm({ ...officeForm, officeName: e.target.value })}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#141414] block mb-1">الدولة</label>
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
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="الفلبين">الفلبين</option>
                    <option value="إثيوبيا">إثيوبيا</option>
                    <option value="الهند">الهند</option>
                    <option value="كينيا">كينيا</option>
                    <option value="أوغندا">أوغندا</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#141414] block mb-1">رقم الترخيص الوزاري *</label>
                  <input
                    type="text"
                    required
                    placeholder="POEA-2026-..."
                    value={officeForm.licenseNumber}
                    onChange={e => setOfficeForm({ ...officeForm, licenseNumber: e.target.value })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#141414] block mb-1">اسم المدير المسؤول</label>
                  <input
                    type="text"
                    placeholder="اسم مدير المكتب..."
                    value={officeForm.managerName}
                    onChange={e => setOfficeForm({ ...officeForm, managerName: e.target.value })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#141414] block mb-1">عدد السير الجاهزة</label>
                  <input
                    type="number"
                    value={officeForm.activeCandidatesCount}
                    onChange={e => setOfficeForm({ ...officeForm, activeCandidatesCount: e.target.value })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs text-[#141414] font-bold focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#141414] block mb-1">الهاتف الدولي</label>
                  <input
                    type="text"
                    placeholder="+..."
                    value={officeForm.phone}
                    onChange={e => setOfficeForm({ ...officeForm, phone: e.target.value })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#141414] block mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    placeholder="agency@..."
                    value={officeForm.email}
                    onChange={e => setOfficeForm({ ...officeForm, email: e.target.value })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#e0e0e0]">
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
        <div role="dialog" aria-modal="true" onClick={() => setShowAddUserModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[24px] p-6 w-full max-w-lg border border-[#e0e0e0] font-sans max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-[#e0e0e0]">
              <h3 className="text-sm font-bold text-[#141414] m-0">إضافة مستخدم وكيل خارجي</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#141414] block mb-1">اسم المستخدم بالكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: John Dela Cruz"
                  value={userForm.name}
                  onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#141414] block mb-1">المكتب المرتبط</label>
                <select
                  value={userForm.linked_office}
                  onChange={e => setUserForm({ ...userForm, linked_office: e.target.value })}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  {offices.map(o => (
                    <option key={o.id} value={o.officeName}>{o.officeName} ({o.country})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#141414] block mb-1">رقم الجوال *</label>
                  <input
                    type="text"
                    required
                    placeholder="+..."
                    value={userForm.phone}
                    onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#141414] block mb-1">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    required
                    placeholder="user@agency.com"
                    value={userForm.email}
                    onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#e0e0e0]">
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
        <div role="dialog" aria-modal="true" onClick={() => setShowAddFileModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[24px] p-6 w-full max-w-lg border border-[#e0e0e0] font-sans max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-[#e0e0e0]">
              <h3 className="text-sm font-bold text-[#141414] m-0">رفع وثيقة أو ترخيص معتمد للمكتب</h3>
              <button onClick={() => setShowAddFileModal(false)} className="text-[#707070] hover:text-[#141414]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveFile} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#141414] block mb-1">المكتب الخارجي</label>
                <select
                  value={fileForm.office_name}
                  onChange={e => setFileForm({ ...fileForm, office_name: e.target.value })}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  {offices.map(o => (
                    <option key={o.id} value={o.officeName}>{o.officeName} ({o.country})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#141414] block mb-1">عنوان الوثيقة أو الترخيص *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ترخيص وزارة العمل السنوي 2026"
                  value={fileForm.file_title}
                  onChange={e => setFileForm({ ...fileForm, file_title: e.target.value })}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#141414] block mb-1">نوع الملف</label>
                  <select
                    value={fileForm.file_type}
                    onChange={e => setFileForm({ ...fileForm, file_type: e.target.value })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="PDF">مستند PDF رقمي</option>
                    <option value="Image (JPG/PNG)">صورة ترخيص رسمية</option>
                    <option value="DOCX">ملف وورد تعاقدي</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#141414] block mb-1">تاريخ انتهاء الترخيص</label>
                  <input
                    type="date"
                    value={fileForm.expiry_date}
                    onChange={e => setFileForm({ ...fileForm, expiry_date: e.target.value })}
                    className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs font-mono text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#141414] block mb-1">إرفاق الملف الفعلي (PDF / صورة ترخيص)</label>
                <input
                  type="file"
                  accept=".pdf,image/*,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 1_500_000) {
                      addNotification({
                        title: 'حجم الملف كبير',
                        message: 'الحد الأقصى للترخيص المرفق 1.5 ميجابايت.',
                        type: 'warning',
                      });
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      const ext = file.name.toLowerCase().endsWith('.pdf')
                        ? 'PDF'
                        : /\.(png|jpe?g|webp)$/i.test(file.name)
                          ? 'Image (JPG/PNG)'
                          : 'DOCX';
                      setFileForm((prev) => ({
                        ...prev,
                        file_title: prev.file_title || file.name.replace(/\.[^.]+$/, ''),
                        file_type: ext,
                        file_name: file.name,
                        file_size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
                        file_data_url: String(reader.result || ''),
                      }));
                    };
                    reader.readAsDataURL(file);
                  }}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-xl py-2 px-3 text-xs text-[#141414]"
                />
                {fileForm.file_name && (
                  <div className="text-[11px] font-mono text-[#707070] mt-1">
                    المرفق الجاهز: {fileForm.file_name} ({fileForm.file_size})
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#e0e0e0]">
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
