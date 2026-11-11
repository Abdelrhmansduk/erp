import i18n from '../i18n/config';
import React, { useState, useEffect } from 'react';
import { Badge } from '../components/ui/Badge';
import { exportData } from '../services/exportService';
import { ExportDropdown } from '../components/common/ExportDropdown';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { realErpDataStore } from '../services/realErpDataStore';
import { useAppStore } from '../stores/appStore';
import { KAS_ALLOWED_EMPLOYEES, CORPORATE_DEPARTMENTS } from '../services/authService';
import { 
  UserCheck, ShieldCheck, Plus, FileSpreadsheet, FileText, Search, 
  Fingerprint, Lock, Shield, X, Check, QrCode, Smartphone, MessageSquare, 
  Mail, ArrowLeft, Trash2, UserX, UserCog, Edit3, Key, Star, ScanFace,
  RefreshCw, CheckCircle2, AlertCircle, Laptop
} from 'lucide-react';
import { 
  getStoredBiometricCredentials, 
  registerUserBiometric, 
  testBiometricAssertion, 
  removeStoredBiometricCredential, 
  toggleBiometricStatus, 
  checkWebAuthnSupport, 
  RegisteredBiometricCredential 
} from '../services/webAuthnBiometricService';

export interface UserAdmin {
  id: string;
  name: string;
  username: string;
  user_type: string;
  role: string;
  branch: string;
  phone: string;
  email: string;
  status: 'نشط' | 'محظور';
  two_factor_enabled: boolean;
  two_factor_method?: 'Google Authenticator' | 'SMS' | 'WhatsApp' | 'Email' | 'بصمة بيومترية (FIDO2)';
  biometric_enabled?: boolean;
  biometric_type?: 'Touch ID (بصمة إصبع)' | 'Face ID (بصمة وجه)' | 'بصمة مزدوجة';
}

const MOCK_USERS: UserAdmin[] = KAS_ALLOWED_EMPLOYEES.map((emp, idx) => ({
  id: emp.id,
  name: emp.nameAr,
  username: emp.username,
  user_type: CORPORATE_DEPARTMENTS[emp.department_id]?.nameAr || emp.titleAr,
  role: emp.titleAr,
  branch: emp.branch,
  phone: `054${String(3380000 + idx * 17).slice(0, 7)}`,
  email: emp.email,
  status: 'نشط',
  two_factor_enabled: true,
  two_factor_method: emp.department_id === 'executive' ? 'بصمة بيومترية (FIDO2)' : 'Google Authenticator',
  biometric_enabled: emp.department_id === 'executive',
  biometric_type: emp.department_id === 'executive' ? 'بصمة مزدوجة' : undefined,
}));

export const UsersPage: React.FC = () => {
  const { addNotification } = useAppStore();
  const [users, setUsers] = useState<UserAdmin[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserAdmin | null>(null);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [userToEditRole, setUserToEditRole] = useState<UserAdmin | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'Google Authenticator' | 'SMS' | 'WhatsApp' | 'Email' | 'بصمة بيومترية (FIDO2)'>('Google Authenticator');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState('');

  // User Biometrics Management Modal States
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [userForBiometrics, setUserForBiometrics] = useState<UserAdmin | null>(null);
  const [userCredentials, setUserCredentials] = useState<RegisteredBiometricCredential[]>([]);
  const [hardwareInfo, setHardwareInfo] = useState<{ supported: boolean; hasHardware: boolean; detectedDevice: string }>({
    supported: false,
    hasHardware: false,
    detectedDevice: ''
  });
  const [isEnrollingBio, setIsEnrollingBio] = useState(false);
  const [testingBioId, setTestingBioId] = useState<string | null>(null);
  const [testBioResult, setTestBioResult] = useState<{ credId: string; success: boolean; message: string } | null>(null);
  const [enrollBioType, setEnrollBioType] = useState<'Touch ID (بصمة إصبع)' | 'Face ID (بصمة وجه)' | 'بصمة مزدوجة'>('Touch ID (بصمة إصبع)');

  // New User Form State
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    role: 'Operations Lead',
    user_type: 'إدارة العمليات والتشغيل',
    branch: 'الفرع الرئيسي',
    phone: '',
    email: '',
    two_factor_enabled: true,
    biometric_enabled: true,
    biometric_type: 'Touch ID (بصمة إصبع)' as const
  });

  // Edit Role Form State
  const [editRoleForm, setEditRoleForm] = useState({
    role: 'Operations Lead',
    user_type: 'إدارة العمليات والتشغيل',
    branch: 'الفرع الرئيسي',
    status: 'نشط' as 'نشط' | 'محظور'
  });

  useEffect(() => {
    realErpDataStore.getRecords<UserAdmin>('system_users', MOCK_USERS).then(data => setUsers(data));
  }, []);

  const handleOpen2FAModal = (user: UserAdmin) => {
    setSelectedUser(user);
    setSelectedMethod(user.two_factor_method || 'Google Authenticator');
    setOtpCode('');
    setStep(1);
    setShow2FAModal(true);
  };

  const handleOpenEditRoleModal = (user: UserAdmin) => {
    setUserToEditRole(user);
    setEditRoleForm({
      role: user.role,
      user_type: user.user_type,
      branch: user.branch,
      status: user.status
    });
    setShowEditRoleModal(true);
  };

  const handleSaveRoleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEditRole) return;

    const patch = {
      role: editRoleForm.role,
      user_type: editRoleForm.user_type,
      branch: editRoleForm.branch,
      status: editRoleForm.status
    };

    const updated = await realErpDataStore.updateRecord<UserAdmin>('system_users', userToEditRole.id, patch, MOCK_USERS);
    setUsers(updated);
    setShowEditRoleModal(false);

    // Audit log
    await realErpDataStore.addRecord('activity_log', {
      id: `LOG-${Date.now()}`,
      user_name: 'مدير النظام العام',
      role: 'Super Admin',
      action_type: 'تعديل',
      module: 'إدارة المستخدمين',
      details: `تعديل وترقية صلاحية المستخدم (${userToEditRole.name}) إلى دور (${editRoleForm.role}) بقسم (${editRoleForm.user_type})`,
      severity: 'تنبيه',
      ip_address: '192.168.1.1',
      device: 'Super Admin Terminal / Edge',
      created_at: new Date().toISOString().slice(0, 16).replace('T', ' ')
    });

    addNotification({
      title: 'تحديث صلاحيات ودور المستخدم',
      message: `تم تعديل دور وصلاحيات المستخدم (${userToEditRole.name}) إلى (${editRoleForm.role}) بنجاح.`,
      type: 'success',
    });
  };

  const handleToggle2FA = async () => {
    if (!selectedUser) return;
    const isEnabling = !selectedUser.two_factor_enabled;

    const patch = {
      two_factor_enabled: isEnabling,
      two_factor_method: isEnabling ? selectedMethod : undefined,
      biometric_enabled: isEnabling ? true : selectedUser.biometric_enabled
    };

    const updated = await realErpDataStore.updateRecord<UserAdmin>('system_users', selectedUser.id, patch, MOCK_USERS);
    setUsers(updated);
    setShow2FAModal(false);

    addNotification({
      title: isEnabling ? 'تفعيل 2FA بنجاح' : 'تعطيل 2FA',
      message: `تم ${isEnabling ? 'تفعيل' : 'إلغاء'} المصادقة الثنائية للمستخدم (${selectedUser.name}) بنجاح.`,
      type: isEnabling ? 'success' : 'info',
    });
  };

  const handleOpenBiometricModal = async (user: UserAdmin) => {
    setUserForBiometrics(user);
    const [creds, hw] = await Promise.all([
      getStoredBiometricCredentials(user.username),
      checkWebAuthnSupport()
    ]);
    setUserCredentials(creds);
    setHardwareInfo(hw);
    setTestBioResult(null);
    setShowBiometricModal(true);
  };

  const handleEnrollBiometricForUser = async () => {
    if (!userForBiometrics) return;
    setIsEnrollingBio(true);
    setTestBioResult(null);

    const result = await registerUserBiometric(
      {
        id: userForBiometrics.id,
        username: userForBiometrics.username,
        fullName: userForBiometrics.name,
        systemScope: 'جميع المنظومات'
      },
      enrollBioType
    );

    setIsEnrollingBio(false);

    if (result.success && result.credential) {
      const updatedCreds = await getStoredBiometricCredentials(userForBiometrics.username);
      setUserCredentials(updatedCreds);

      // Update user status in system_users
      const patch = {
        biometric_enabled: true,
        biometric_type: enrollBioType
      };
      const updatedUsers = await realErpDataStore.updateRecord<UserAdmin>('system_users', userForBiometrics.id, patch, MOCK_USERS);
      setUsers(updatedUsers);
      setUserForBiometrics({ ...userForBiometrics, ...patch });

      addNotification({
        title: 'تم تسجيل البصمة بنجاح',
        message: `تم توثيق وربط المفتاح البيومتري للمستخدم (${userForBiometrics.name}) بنجاح.`,
        type: 'success'
      });
    } else if (result.canceled) {
      addNotification({
        title: 'إلغاء التسجيل',
        message: 'تم إلغاء نافذة تسجيل البصمة من نظام التشغيل.',
        type: 'warning'
      });
    } else {
      addNotification({
        title: 'فشل التسجيل',
        message: result.errorMessage || 'تعذر تسجيل البصمة.',
        type: 'error'
      });
    }
  };

  const handleTestBiometric = async (cred: RegisteredBiometricCredential) => {
    setTestingBioId(cred.id);
    setTestBioResult(null);

    const result = await testBiometricAssertion(cred);
    setTestingBioId(null);

    if (result.success) {
      setTestBioResult({
        credId: cred.id,
        success: true,
        message: result.isRealHardware
          ? `تمت المصادقة بنجاح عبر مستشعر الأمان الحيوي (${result.authenticatorType || 'Hardware'})!`
          : 'تم فحص البصمة والمطابقة التشفيرية بنجاح!'
      });
      if (userForBiometrics) {
        const updated = await getStoredBiometricCredentials(userForBiometrics.username);
        setUserCredentials(updated);
      }
    } else {
      setTestBioResult({
        credId: cred.id,
        success: false,
        message: result.errorMessage || 'فشلت مطابقة البصمة.'
      });
    }
  };

  const handleDeleteBiometric = async (cred: RegisteredBiometricCredential) => {
    if (!confirm(`هل أنت متأكد من حذف البصمة المسجلة (${cred.biometricType}) للمستخدم؟`)) return;
    await removeStoredBiometricCredential(cred.id, cred.username);
    if (userForBiometrics) {
      const updatedCreds = await getStoredBiometricCredentials(userForBiometrics.username);
      setUserCredentials(updatedCreds);

      if (updatedCreds.length === 0) {
        const patch = { biometric_enabled: false };
        const updatedUsers = await realErpDataStore.updateRecord<UserAdmin>('system_users', userForBiometrics.id, patch, MOCK_USERS);
        setUsers(updatedUsers);
        setUserForBiometrics({ ...userForBiometrics, ...patch });
      }
    }
    addNotification({
      title: 'حذف البصمة',
      message: 'تم حذف البصمة البيومترية وإلغاء المفتاح المشفر من النظام.',
      type: 'info'
    });
  };

  const handleToggleBiometricStatus = async (cred: RegisteredBiometricCredential) => {
    const nextStatus = cred.status === 'نشط' ? 'معطل' : 'نشط';
    await toggleBiometricStatus(cred.id, nextStatus);
    if (userForBiometrics) {
      const updatedCreds = await getStoredBiometricCredentials(userForBiometrics.username);
      setUserCredentials(updatedCreds);
    }
    addNotification({
      title: 'تحديث حالة البصمة',
      message: `تم تغيير حالة البصمة إلى (${nextStatus}).`,
      type: 'info'
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.username) return;

    const createdRecord: UserAdmin = {
      id: String(Date.now()),
      name: newUser.name,
      username: newUser.username,
      role: newUser.role,
      user_type: newUser.user_type,
      branch: newUser.branch,
      phone: newUser.phone || '0500000000',
      email: newUser.email || `${newUser.username}@alsulaim.sa`,
      status: 'نشط',
      two_factor_enabled: newUser.two_factor_enabled,
      two_factor_method: newUser.two_factor_enabled ? 'Google Authenticator' : undefined,
      biometric_enabled: newUser.biometric_enabled,
      biometric_type: newUser.biometric_enabled ? newUser.biometric_type : undefined
    };

    const updated = await realErpDataStore.addRecord<UserAdmin>('system_users', createdRecord, MOCK_USERS);
    setUsers(updated);
    setShowAddUserModal(false);

    addNotification({
      title: 'إنشاء حساب مستخدم جديد',
      message: `تم إنشاء حساب المستخدم (${newUser.name}) بنجاح وتعيين الدور (${newUser.role}).`,
      type: 'success',
    });

    setNewUser({
      name: '',
      username: '',
      role: 'Operations Lead',
      user_type: 'إدارة العمليات والتشغيل',
      branch: 'الفرع الرئيسي',
      phone: '',
      email: '',
      two_factor_enabled: true,
      biometric_enabled: true,
      biometric_type: 'Touch ID (بصمة إصبع)'
    });
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف حساب المستخدم (${name})؟`)) return;
    const updated = await realErpDataStore.deleteRecord<UserAdmin>('system_users', id, MOCK_USERS);
    setUsers(updated);
    addNotification({
      title: 'حذف مستخدم',
      message: `تم حذف حساب المستخدم (${name}) من النظام.`,
      type: 'error',
    });
  };

  const handleToggleUserStatus = async (user: UserAdmin) => {
    const nextStatus = user.status === 'نشط' ? 'محظور' : 'نشط';
    const updated = await realErpDataStore.updateRecord<UserAdmin>('system_users', user.id, { status: nextStatus }, MOCK_USERS);
    setUsers(updated);
    addNotification({
      title: 'تغيير حالة المستخدم',
      message: `تم تعديل حالة (${user.name}) إلى (${nextStatus}).`,
      type: nextStatus === 'نشط' ? 'success' : 'warning',
    });
  };

  const filteredUsers = users.filter(u =>
    u.name.includes(searchQuery) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.branch.includes(searchQuery) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div
        className="card-feature-cinematic"
        style={{
          background: '#141414',
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
        <div className="flex items-center gap-4">
          <div className="hidden sm:block shrink-0">
            <BusinessIllustration type="iam-security" size="sm" showBackground={true} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="pill-tag-mint" style={{ fontSize: '11px' }}>RBAC & ZERO TRUST AUTH</span>
              <span className="pill-tag-shade" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}>إدارة المستخدمين والصلاحيات</span>
            </div>
            <h1 className="display-sm" style={{ fontSize: '24px', fontWeight: 330, letterSpacing: '-0.02em', color: '#ffffff', margin: 0, fontFamily: 'var(--font-family-display)' }}>
              مستخدمو النظام والتحكم بالصلاحيات
            </h1>
            <p style={{ fontSize: '13px', color: '#a1a1aa', margin: '4px 0 0 0', fontWeight: 420 }}>
              إدارة حسابات الموظفين، تعيين الأدوار والصلاحيات، المصادقة الثنائية (2FA)، وتفويض البصمات البيومترية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="button-white-pill"
            onClick={() => setShowAddUserModal(true)}
            style={{ fontSize: '12.5px', padding: '6px 18px', minHeight: '38px' }}
          >
            <Plus className="w-4 h-4 ml-1" />
            <span>+ مستخدم جديد</span>
          </button>
          <ExportDropdown
            sectionKey="users"
            data={filteredUsers}
            customTitle="سجل مستخدمي النظام والصلاحيات الإدارية"
            variant="outline-dark"
            buttonLabel="تصدير بيانات المستخدمين (10 صيغ)"
          />
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stat-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>إجمالي المستخدمين</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>{users.length} مستخدمين</div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>حسابات معتمدة</span>
        </div>

        <div className="card-pistachio-band" style={{ padding: '24px', borderRadius: '16px' }}>
          <span style={{ fontSize: '13px', color: '#141414', fontWeight: 550 }}>المصادقة الثنائية (2FA)</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {users.filter(u => u.two_factor_enabled).length} مفعلين
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>حماية فائقة</span>
        </div>

        <div className="card-pricing-featured" style={{ padding: '24px', borderRadius: '16px', background: '#141414', color: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 550 }}>البصمة البيومترية</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#ffffff', marginTop: '6px', letterSpacing: '-0.02em' }}>
            {users.filter(u => u.biometric_enabled).length} مسجلين
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px', marginTop: '10px' }}>Touch ID & Face ID</span>
        </div>

        <div className="card-pricing" style={{ padding: '24px', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '13px', color: '#71717a', fontWeight: 550 }}>الصلاحيات النشطة</span>
          <div className="display-sm" style={{ fontSize: '36px', fontWeight: 330, color: '#141414', marginTop: '6px', letterSpacing: '-0.02em' }}>6 أدوار</div>
          <span className="pill-tag-shade" style={{ fontSize: '11px', marginTop: '10px' }}>{i18n.t("exec.rbacMatrix", "مصفوفة الصلاحيات RBAC")}</span>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="card-pricing" style={{ padding: 0, borderRadius: '24px', background: '#ffffff', overflow: 'hidden' }}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-white flex-wrap gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute right-3 top-3 text-[#707070]" />
            <input
              type="text"
              placeholder="البحث بالاسم، اسم المستخدم، الفرع، أو الدور..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-input"
              style={{ width: '100%', height: '36px', minHeight: '36px', borderRadius: '9999px', paddingRight: '36px', fontSize: '12px' }}
            />
          </div>
          <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
            المستخدمين المتاحين: {filteredUsers.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-zinc-700">
            <thead className="bg-zinc-50 text-zinc-700 font-bold border-b border-zinc-200">
              <tr>
                <th className="p-3.5">المستخدم</th>
                <th className="p-3.5">الدور الوظيفي (Role)</th>
                <th className="p-3.5">الفرع المخصص</th>
                <th className="p-3.5">المصادقة الثنائية (2FA)</th>
                <th className="p-3.5">البصمة البيومترية</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5 text-center">إدارة الصلاحيات والأمان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center gap-3">
                      <CorporateAvatar
                        name={u.name}
                        role={u.role}
                        email={u.email}
                        size="sm"
                        status={u.status === 'نشط' ? 'online' : 'none'}
                      />
                      <div>
                        <div className="font-bold text-[#141414]">{u.name}</div>
                        <div className="text-[11px] text-[#707070] font-mono">@{u.username} • {u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <Badge text={u.role} type="purple" />
                    <div className="text-[11px] text-[#707070] mt-0.5">{u.user_type}</div>
                  </td>
                  <td className="p-3.5 font-semibold text-zinc-800">{u.branch}</td>
                  <td className="p-3.5">
                    {u.two_factor_enabled ? (
                      <Badge text={`مفعلة (${u.two_factor_method || 'TOTP'})`} type="success" />
                    ) : (
                      <Badge text="غير مفعلة" type="warning" />
                    )}
                  </td>
                  <td className="p-3.5">
                    {u.biometric_enabled ? (
                      <button
                        type="button"
                        onClick={() => handleOpenBiometricModal(u)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f3f3f3] text-[#141414] text-[11px] font-bold border border-[#e0e0e0] hover:bg-[#f3f3f3] transition-all cursor-pointer shadow-xs"
                        title="إدارة البصمات المسجلة لهذا المستخدم"
                      >
                        <Fingerprint className="w-3.5 h-3.5 text-[#141414]" />
                        <span>{u.biometric_type || 'بصمة معتمدة'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenBiometricModal(u)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[10.5px] border border-zinc-200 hover:bg-zinc-200 transition-all cursor-pointer"
                        title="تسجيل بصمة جديدة"
                      >
                        <Plus className="w-3 h-3 text-[#707070]" />
                        <span>تسجيل بصمة</span>
                      </button>
                    )}
                  </td>
                  <td className="p-3.5"><Badge text={u.status} type={u.status === 'نشط' ? 'success' : 'danger'} /></td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => handleOpenBiometricModal(u)}
                        className="button-outline-on-light text-[#141414] hover:border-[#141414]"
                        style={{ padding: '3px 8px', fontSize: '11px', minHeight: '26px' }}
                        title="إدارة وتوثيق المفاتيح البيومترية (WebAuthn / FIDO2)"
                      >
                        <Fingerprint className="w-3 h-3 ml-1 text-[#141414]" />
                        <span>البصمة</span>
                      </button>
                      <button
                        onClick={() => handleOpenEditRoleModal(u)}
                        className="button-outline-on-light"
                        style={{ padding: '3px 8px', fontSize: '11px', minHeight: '26px' }}
                        title="تعديل وترقية الدور والصلاحيات"
                      >
                        <UserCog className="w-3 h-3 ml-1 text-[#141414]" />
                        <span>الصلاحيات</span>
                      </button>
                      <button
                        onClick={() => handleOpen2FAModal(u)}
                        className="button-outline-on-light"
                        style={{ padding: '3px 8px', fontSize: '11px', minHeight: '26px' }}
                        title="إعدادات المصادقة الثنائية 2FA"
                      >
                        <Shield className="w-3 h-3 ml-1 text-zinc-600" />
                        <span>2FA</span>
                      </button>
                      <button
                        onClick={() => handleToggleUserStatus(u)}
                        className={`p-1 rounded-lg border transition-colors ${u.status === 'نشط' ? 'border-[#e0e0e0] text-[#141414] hover:bg-[#eaeaea]' : 'border-[#e0e0e0] text-[#141414] hover:bg-[#f3f3f3]'}`}
                        title={u.status === 'نشط' ? 'حظر المستخدم' : 'تفعيل المستخدم'}
                      >
                        {u.status === 'نشط' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        className="p-1 rounded-lg border border-[#e0e0e0] text-[#141414] hover:bg-[#eaeaea] transition-colors"
                        title="حذف المستخدم نهائياً"
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

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#141414]" />
                <span>إنشاء مستخدم جديد وتعيين الصلاحيات</span>
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4 bg-white text-[#141414]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم الموظف الثلاثي *</label>
                  <input
                    type="text"
                    required
                    value={newUser.name}
                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="مثال: خالد محمد العتيبي"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">اسم المستخدم (Username) *</label>
                  <input
                    type="text"
                    required
                    value={newUser.username}
                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder="مثال: khaled_ops"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الدور الوظيفي (Role)</label>
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="Administrator">Administrator (مدير نظام عام)</option>
                    <option value="HR Director">HR Director (مدير موارد بشرية)</option>
                    <option value="Financial Manager">Financial Manager (مدير مالي واعتمادات)</option>
                    <option value="Branch Manager">Branch Manager (مدير فرع)</option>
                    <option value="Operations Lead">Operations Lead (مشرف تشغيل وعقود)</option>
                    <option value="Shelter Supervisor">Shelter Supervisor (مشرف إيواء)</option>
                    <option value="Sales Agent">Sales Agent (مسؤول مبيعات وعملاء)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">الفرع المخصص</label>
                  <select
                    value={newUser.branch}
                    onChange={e => setNewUser({ ...newUser, branch: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                  >
                    <option value="الفرع الرئيسي">الفرع الرئيسي - الرياض</option>
                    <option value="فرع الرياض - اليرموك">فرع الرياض - اليرموك</option>
                    <option value="فرع جدة - التحلية">فرع جدة - التحلية</option>
                    <option value="فرع الخبر - الكورنيش">فرع الخبر - الكورنيش</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">رقم الجوال للتحقق OTP</label>
                  <input
                    type="text"
                    value={newUser.phone}
                    onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                    placeholder="05XXXXXXXX"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">البريد الإلكتروني الرسمي</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="user@alsulaim.sa"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] font-mono focus:border-[#141414] focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUser.two_factor_enabled}
                    onChange={e => setNewUser({ ...newUser, two_factor_enabled: e.target.checked })}
                    className="rounded text-[#141414] focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-[#141414]">تفعيل التحقق الثنائي (2FA) عند أول تسجيل دخول</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUser.biometric_enabled}
                    onChange={e => setNewUser({ ...newUser, biometric_enabled: e.target.checked })}
                    className="rounded text-[#141414] accent-[#141414] focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-[#141414]">تمكين الدخول بالبصمة البيومترية (Touch ID / Face ID)</span>
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
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
                  حفظ وإنشاء المستخدم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role & Permissions Modal */}
      {showEditRoleModal && userToEditRole && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <UserCog className="w-4 h-4 text-[#141414]" />
                <span>تعديل وترقية دور المستخدم الصلاحيات</span>
              </h3>
              <button onClick={() => setShowEditRoleModal(false)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoleChange} className="p-6 space-y-4 bg-white text-[#141414]">
              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
                <span className="text-[11px] text-[#707070] font-semibold block">المستخدم المحدد:</span>
                <div className="font-bold text-sm text-[#141414] mt-0.5">{userToEditRole.name}</div>
                <div className="text-[11px] text-[#707070] font-mono">@{userToEditRole.username} • {userToEditRole.email}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">الدور الوظيفي في الـ ERP (RBAC Role) *</label>
                <select
                  value={editRoleForm.role}
                  onChange={e => setEditRoleForm({ ...editRoleForm, role: e.target.value })}
                  className="w-full bg-[#f3f3f3] border border-[#e0e0e0] rounded-2xl py-2 px-3 text-xs text-[#141414] font-bold focus:outline-none"
                >
                  <option value="Administrator">Administrator (مدير نظام عام - كافة الصلاحيات)</option>
                  <option value="Branch Manager">Branch Manager (مدير فرع)</option>
                  <option value="Financial Manager">Financial Manager (مدير مالي واعتمادات)</option>
                  <option value="HR Director">HR Director (مدير الموارد البشرية)</option>
                  <option value="Operations Lead">Operations Lead (مشرف تشغيل وعقود)</option>
                  <option value="Shelter Supervisor">Shelter Supervisor (مشرف إيواء)</option>
                  <option value="Sales Agent">Sales Agent (مسؤول مبيعات وعملاء)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">القسم الإداري *</label>
                <select
                  value={editRoleForm.user_type}
                  onChange={e => setEditRoleForm({ ...editRoleForm, user_type: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  <option value="الإدارة العليا والتنفيذية">الإدارة العليا والتنفيذية</option>
                  <option value="إدارة العمليات والتشغيل">إدارة العمليات والتشغيل</option>
                  <option value="الإدارة المالية">الإدارة المالية</option>
                  <option value="الموارد البشرية">الموارد البشرية</option>
                  <option value="خدمة العملاء والـ CRM">خدمة العملاء والـ CRM</option>
                  <option value="إدارة الإيواء والتسكين">إدارة الإيواء والتسكين</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">الفرع المخصص</label>
                <select
                  value={editRoleForm.branch}
                  onChange={e => setEditRoleForm({ ...editRoleForm, branch: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 text-xs text-[#141414] focus:border-[#141414] focus:outline-none"
                >
                  <option value="الفرع الرئيسي">الفرع الرئيسي - الرياض</option>
                  <option value="فرع الرياض - اليرموك">فرع الرياض - اليرموك</option>
                  <option value="فرع جدة - التحلية">فرع جدة - التحلية</option>
                  <option value="فرع الخبر - الكورنيش">فرع الخبر - الكورنيش</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowEditRoleModal(false)}
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
                  حفظ وتطبيق الدور
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2FA & Biometric Management Modal */}
      {show2FAModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans">
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between">
              <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-[#141414]" />
                <span>إعدادات المصادقة الثنائية والبصمة ({selectedUser.name})</span>
              </h3>
              <button onClick={() => setShow2FAModal(false)} className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-white text-[#141414]">
              {selectedUser.two_factor_enabled ? (
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] mx-auto flex items-center justify-center">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#141414]">المصادقة الثنائية مفعلة بنجاح</h4>
                    <p className="text-xs text-[#707070] mt-1">
                      الوسيلة الحالية: <span className="font-bold text-[#141414]">{selectedUser.two_factor_method || 'Google Authenticator'}</span>
                    </p>
                    {selectedUser.biometric_enabled && (
                      <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full bg-[#f3f3f3] text-[#141414] text-[11px] font-bold border border-[#e0e0e0]">
                        <Fingerprint className="w-3.5 h-3.5" />
                        <span>مفوض بالبصمة البيومترية ({selectedUser.biometric_type})</span>
                      </span>
                    )}
                  </div>

                  <div className="flex gap-3 justify-center pt-2">
                    <button
                      onClick={handleToggle2FA}
                      className="button-outline-on-light text-[#141414] border-[#e0e0e0] hover:bg-[#eaeaea]"
                      style={{ minHeight: '36px', padding: '6px 16px', fontSize: '12px' }}
                    >
                      إلغاء تفعيل المصادقة الثنائية
                    </button>
                    <button
                      onClick={() => setShow2FAModal(false)}
                      className="button-primary-pill"
                      style={{ minHeight: '36px', padding: '6px 20px', fontSize: '12px' }}
                    >
                      إغلاق
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {step === 1 ? (
                    <div className="space-y-3">
                      <p className="text-xs text-zinc-600">
                        اختر وسيلة التحقق الإضافية لتأمين حساب الموظف ومنع الوصول غير المصرح:
                      </p>

                      <div className="space-y-2">
                        <label
                          onClick={() => setSelectedMethod('Google Authenticator')}
                          className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                            selectedMethod === 'Google Authenticator' ? 'border-[#141414] bg-zinc-50' : 'border-zinc-200 hover:bg-zinc-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="2fa-method"
                            checked={selectedMethod === 'Google Authenticator'}
                            onChange={() => setSelectedMethod('Google Authenticator')}
                            className="mt-1 accent-black"
                          />
                          <div>
                            <span className="font-bold text-xs text-[#141414] flex items-center gap-1">
                              <Smartphone className="w-3.5 h-3.5" />
                              <span>تطبيق المصادقة (Google / Microsoft Authenticator)</span>
                            </span>
                            <span className="text-[11px] text-[#707070] block mt-0.5">رموز زمنية مشفرة (TOTP) تتغير كل 30 ثانية دون الحاجة للاتصال.</span>
                          </div>
                        </label>

                        <label
                          onClick={() => setSelectedMethod('بصمة بيومترية (FIDO2)')}
                          className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                            selectedMethod === 'بصمة بيومترية (FIDO2)' ? 'border-[#e0e0e0] bg-[#f3f3f3]' : 'border-zinc-200 hover:bg-zinc-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="2fa-method"
                            checked={selectedMethod === 'بصمة بيومترية (FIDO2)'}
                            onChange={() => setSelectedMethod('بصمة بيومترية (FIDO2)')}
                            className="mt-1 accent-[#141414]"
                          />
                          <div>
                            <span className="font-bold text-xs text-[#141414] flex items-center gap-1">
                              <Fingerprint className="w-3.5 h-3.5 text-[#141414]" />
                              <span>بصمة الإصبع أو الوجه (Touch ID / Face ID / Windows Hello)</span>
                            </span>
                            <span className="text-[11px] text-[#707070] block mt-0.5">مصادقة مباشرة عبر شريحة الأمان للأجهزة الداعمة لـ WebAuthn.</span>
                          </div>
                        </label>

                        <label
                          onClick={() => setSelectedMethod('SMS')}
                          className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                            selectedMethod === 'SMS' ? 'border-[#141414] bg-zinc-50' : 'border-zinc-200 hover:bg-zinc-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="2fa-method"
                            checked={selectedMethod === 'SMS'}
                            onChange={() => setSelectedMethod('SMS')}
                            className="mt-1 accent-black"
                          />
                          <div>
                            <span className="font-bold text-xs text-[#141414] flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>رسالة نصية قصيرة (SMS OTP)</span>
                            </span>
                            <span className="text-[11px] text-[#707070] block mt-0.5">إرسال كود تحقق مكون من 6 أرقام إلى الهاتف المسجل ({selectedUser.phone}).</span>
                          </div>
                        </label>
                      </div>

                      <div className="flex gap-3 justify-end pt-3 border-t border-zinc-100">
                        <button className="button-outline-on-light" onClick={() => setShow2FAModal(false)} style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }}>
                          إلغاء
                        </button>
                        <button className="button-primary-pill" onClick={() => setStep(2)} style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}>
                          <span>المتابعة وإظهار الرمز</span>
                          <ArrowLeft className="w-4 h-4 mr-1" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 text-center">
                      {selectedMethod === 'Google Authenticator' ? (
                        <div>
                          <p className="text-xs text-zinc-600 mb-3">
                            امسح كود الـ QR التالي بواسطة تطبيق Google Authenticator على جوالك:
                          </p>
                          
                          <div className="w-36 h-36 mx-auto mb-3 bg-zinc-100 border border-zinc-300 rounded-2xl flex flex-col items-center justify-center">
                            <QrCode className="w-20 h-20 text-[#141414]" />
                            <span className="text-[9px] text-[#707070] font-mono mt-1 font-bold">ALSALIM 2FA KEY</span>
                          </div>

                          <div className="bg-zinc-100 p-2 rounded-xl text-xs font-mono font-bold text-[#141414] inline-block">
                            TOTP CODE: ••••-••••-••••-••••
                          </div>
                        </div>
                      ) : selectedMethod === 'بصمة بيومترية (FIDO2)' ? (
                        <div>
                          <Fingerprint className="w-12 h-12 text-[#141414] mx-auto mb-2" />
                          <p className="text-sm font-bold text-[#141414]">
                            جاهز لتسجيل وتفويض البصمة البيومترية للمستخدم
                          </p>
                          <p className="text-xs text-[#707070] mt-1">
                            سيتم إنشاء مفتاح Passkey مشفر وتخزينه في Secure Storage للجهاز المعتمد.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <MessageSquare className="w-10 h-10 text-[#141414] mx-auto mb-2" />
                          <p className="text-xs font-bold text-[#141414]">
                            سيتم إرسال رمز التحقق عند تسجيل الدخول القادم عبر {selectedMethod} إلى ({selectedUser.phone}).
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-zinc-700">
                          أدخل رمز التحقق (OTP) المكون من 6 أرقام للتأكيد وتفعيل الحماية *
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="123456"
                          value={otpCode}
                          onChange={e => setOtpCode(e.target.value)}
                          className="text-center text-lg font-mono font-bold tracking-widest w-44 mx-auto block bg-zinc-50 border border-zinc-200 rounded-2xl py-2 px-3 focus:border-[#141414] focus:outline-none"
                        />
                      </div>

                      <div className="flex gap-3 justify-end pt-3 border-t border-zinc-100">
                        <button className="button-outline-on-light" onClick={() => setStep(1)} style={{ minHeight: '36px', padding: '6px 16px', fontSize: '13px' }}>
                          رجوع
                        </button>
                        <button className="button-primary-pill" onClick={handleToggle2FA} style={{ minHeight: '36px', padding: '6px 20px', fontSize: '13px' }}>
                          <Check className="w-4 h-4 ml-1" />
                          <span>تأكيد وتفعيل الحماية</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Dedicated Real Hardware Biometric Management Modal (WebAuthn / FIDO2) */}
      {showBiometricModal && userForBiometrics && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden font-sans max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 bg-[#f3f3f3] border-b border-[#e0e0e0] text-[#141414] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] flex items-center justify-center text-[#141414] shadow-sm">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="pill-tag-mint text-[10px]">FIDO2 / WEBAUTHN HARDWARE</span>
                    <span className="text-xs text-[#707070]">إدارة البصمات والمستشعرات</span>
                  </div>
                  <h3 className="font-bold text-base text-[#141414] m-0">
                    البصمة البيومترية للمستخدم: {userForBiometrics.name}
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setShowBiometricModal(false)} 
                className="p-1.5 rounded-full text-[#707070] hover:text-[#141414] hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 bg-white text-[#141414] flex-1">
              {/* User Context & Hardware Readiness Banner */}
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#141414]">{userForBiometrics.name}</span>
                    <span className="text-xs text-[#707070] font-mono">(@{userForBiometrics.username})</span>
                    <Badge text={userForBiometrics.role} type="purple" />
                  </div>
                  <div className="text-xs text-[#707070] mt-1 flex items-center gap-2">
                    <Laptop className="w-3.5 h-3.5 text-[#707070]" />
                    <span>الجهاز الحالي: {hardwareInfo.detectedDevice}</span>
                  </div>
                </div>

                <div className="text-left">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    hardwareInfo.hasHardware 
                      ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]' 
                      : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                  }`}>
                    <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                    <span>{hardwareInfo.hasHardware ? 'مستشعر العتاد متصل ونشط' : 'التشفير البيومتري جاهز'}</span>
                  </span>
                </div>
              </div>

              {/* Registered Biometric Credentials List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-xs text-[#141414] flex items-center gap-2 m-0">
                    <Fingerprint className="w-4 h-4 text-[#141414]" />
                    <span>البصمات والمفاتيح المسجلة ({userCredentials.length})</span>
                  </h4>
                  <span className="text-[11px] text-[#707070]">مخزنة مشفرة بمفتاح فريد FIDO2</span>
                </div>

                {userCredentials.length === 0 ? (
                  <div className="p-6 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-300 space-y-2">
                    <Fingerprint className="w-8 h-8 text-[#707070] mx-auto" />
                    <div className="font-bold text-xs text-zinc-700">لا توجد بصمات بيومترية مسجلة لهذا الحساب حالياً</div>
                    <p className="text-[11px] text-[#707070] max-w-sm mx-auto">
                      يمكنك تسجيل بصمة جهاز المستخدم (Windows Hello / Touch ID / Face ID) لتسريع وتأمين تسجيل الدخول.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {userCredentials.map((cred) => {
                      const isTesting = testingBioId === cred.id;
                      const hasTestResult = testBioResult && testBioResult.credId === cred.id;

                      return (
                        <div 
                          key={cred.id}
                          className="p-4 rounded-2xl border border-zinc-200 bg-white hover:border-zinc-300 transition-all shadow-sm space-y-3"
                        >
                          <div className="flex items-start justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] flex items-center justify-center flex-shrink-0">
                                {cred.biometricType.includes('Face') ? (
                                  <ScanFace className="w-4 h-4" />
                                ) : (
                                  <Fingerprint className="w-4 h-4" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-[#141414]">{cred.biometricType}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    cred.status === 'نشط' ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]' : 'bg-zinc-200 text-zinc-600'
                                  }`}>
                                    {cred.status}
                                  </span>
                                </div>
                                <div className="text-[11px] text-[#707070] font-sans mt-0.5">
                                  {cred.deviceName}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons per Credential */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={isTesting}
                                onClick={() => handleTestBiometric(cred)}
                                className="button-outline-on-light text-[#141414] hover:border-[#141414]"
                                style={{ padding: '4px 10px', fontSize: '11px', minHeight: '28px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                title="اختبار فحص ومطابقة البصمة مع المستشعر الحي"
                              >
                                {isTesting ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    <span>جاري الفحص...</span>
                                  </>
                                ) : (
                                  <>
                                    <Fingerprint className="w-3 h-3" />
                                    <span>فحص واختبار</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleBiometricStatus(cred)}
                                className="button-outline-on-light"
                                style={{ padding: '4px 10px', fontSize: '11px', minHeight: '28px' }}
                                title="تعطيل أو تفعيل البصمة"
                              >
                                <span>{cred.status === 'نشط' ? 'تعطيل' : 'تفعيل'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteBiometric(cred)}
                                className="p-1.5 rounded-lg border border-[#e0e0e0] text-[#141414] hover:bg-[#eaeaea] transition-colors"
                                title="حذف هذه البصمة نهائياً"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Credential Metadata Strip */}
                          <div className="flex items-center justify-between text-[11px] text-[#707070] pt-2 border-t border-zinc-100 flex-wrap gap-2">
                            <span>تاريخ التسجيل: <strong>{new Date(cred.enrolledAt).toLocaleDateString('ar-SA')}</strong></span>
                            <span>آخر استخدام: <strong>{cred.lastUsedAt ? new Date(cred.lastUsedAt).toLocaleString('ar-SA') : 'لم تستخدم بعد'}</strong></span>
                            <span className="font-mono text-[10px] text-[#707070]">ID: {cred.credentialId.slice(0, 16)}...</span>
                          </div>

                          {/* Live Test Feedback Banner */}
                          {hasTestResult && (
                            <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                              testBioResult.success 
                                ? 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]' 
                                : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]'
                            }`}>
                              {testBioResult.success ? (
                                <CheckCircle2 className="w-4 h-4 text-[#141414] flex-shrink-0" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-[#141414] flex-shrink-0" />
                              )}
                              <span>{testBioResult.message}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Enroll New Biometric Section */}
              <div className="p-4 bg-[#f3f3f3] rounded-2xl border border-[#e0e0e0] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-[#141414] flex items-center gap-1.5 m-0">
                    <Plus className="w-4 h-4 text-[#141414]" />
                    <span>تسجيل وتوثيق مفتاح بيومتري جديد لهذا الحساب</span>
                  </h4>
                  <span className="pill-tag-mint text-[10px]">FIDO2 WebAuthn Key</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'Touch ID (بصمة إصبع)', label: 'بصمة الإصبع', desc: 'Windows Hello / Touch ID', icon: Fingerprint },
                    { id: 'Face ID (بصمة وجه)', label: 'بصمة الوجه', desc: 'كاميرا 3D / Face ID', icon: ScanFace },
                    { id: 'بصمة مزدوجة', label: 'بصمة مزدوجة', desc: 'إصبع + وجه معاً', icon: ShieldCheck }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setEnrollBioType(opt.id as any)}
                      className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                        enrollBioType === opt.id
                          ? 'bg-white border-[#141414] ring-2 ring-black/10 shadow-sm'
                          : 'bg-white/60 border-zinc-200 hover:bg-white hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-[#141414]">{opt.label}</span>
                        <opt.icon className="w-3.5 h-3.5 text-[#141414]" />
                      </div>
                      <span className="text-[10px] text-[#707070] block">{opt.desc}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={isEnrollingBio}
                  onClick={handleEnrollBiometricForUser}
                  className="button-primary-pill w-full"
                  style={{
                    height: '42px',
                    fontSize: '13px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isEnrollingBio ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>جاري استدعاء نافذة مستشعر البصمة من نظام التشغيل...</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4" />
                      <span>بدء تسجيل وتفويض البصمة البيومترية على هذا الجهاز</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between flex-shrink-0">
              <span className="text-xs text-[#707070]">
                يتم تشفير وتأمين المفاتيح البيومترية وفق معايير FIDO2 / W3C العالمية
              </span>
              <button
                type="button"
                onClick={() => setShowBiometricModal(false)}
                className="button-outline-on-light"
                style={{ padding: '6px 20px', fontSize: '12.5px', minHeight: '36px' }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
