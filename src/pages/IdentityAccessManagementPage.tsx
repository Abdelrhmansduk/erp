import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, Users, Building2, Layers, KeyRound, UserCheck, 
  Clock, ShieldAlert, Sparkles, Plus, Search, Filter, RefreshCw, 
  Trash2, Edit3, CheckCircle2, AlertCircle, Lock, Eye, Download, 
  Smartphone, Fingerprint, QrCode, ArrowLeftRight, Check, X, 
  FileText, Shield, UserX, AlertTriangle, ChevronDown, Activity, 
  Calendar, FileSpreadsheet, Send, Copy, ExternalLink, Sliders
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { useIamSession } from '../contexts/IamSessionContext';
import { iamPolicyEngine } from '../services/iamPolicyEngine';
import { RolesPermissionsMatrixWidget } from '../components/iam/RolesPermissionsMatrixWidget';
import { UserScopeEditModal } from '../components/iam/UserScopeEditModal';
import { BusinessIllustration } from '../components/common/BusinessIllustration';
import { CorporateAvatar } from '../components/common/CorporateAvatar';
import { 
  IamUser, IamCompany, IamBranch, IamDepartment, IamMembership, 
  IamRole, IamPermission, IamDelegation, IamSoDRule, IamAccessRequest, 
  IamAccessReview, IamUserSession, IamAuditLog 
} from '../types/iam';
import { useAppStore } from '../stores/appStore';

type IamTab = 
  | 'users'
  | 'companies'
  | 'memberships'
  | 'roles-matrix'
  | 'access-requests'
  | 'delegations'
  | 'sod-rules'
  | 'access-reviews'
  | 'sessions'
  | 'audit-logs';

export const IdentityAccessManagementPage: React.FC = () => {
  const { activeTab: storeActiveTab, addNotification } = useAppStore();
  const { 
    currentUser, 
    activeCompany, 
    isSuperAdmin, 
    switchCompany, 
    logAuditAction 
  } = useIamSession();

  const mapStoreTabToIamTab = (tabKey: string): IamTab => {
    switch (tabKey) {
      case 'roles-permissions':
      case 'iam-matrix':
        return 'roles-matrix';
      case 'multi-company-iam':
        return 'companies';
      default:
        return 'users';
    }
  };

  const [activeTab, setActiveTab] = useState<IamTab>(() => mapStoreTabToIamTab(storeActiveTab));
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterAccountType, setFilterAccountType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    setActiveTab(mapStoreTabToIamTab(storeActiveTab));
  }, [storeActiveTab]);

  // Core Data States
  const [users, setUsers] = useState<IamUser[]>([]);
  const [companies, setCompanies] = useState<IamCompany[]>([]);
  const [branches, setBranches] = useState<IamBranch[]>([]);
  const [departments, setDepartments] = useState<IamDepartment[]>([]);
  const [roles, setRoles] = useState<IamRole[]>([]);
  const [permissions, setPermissions] = useState<IamPermission[]>([]);
  const [delegations, setDelegations] = useState<IamDelegation[]>([]);
  const [sodRules, setSodRules] = useState<IamSoDRule[]>([]);
  const [accessRequests, setAccessRequests] = useState<IamAccessRequest[]>([]);
  const [accessReviews, setAccessReviews] = useState<IamAccessReview[]>([]);
  const [sessions, setSessions] = useState<IamUserSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<IamAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showNewDelegationModal, setShowNewDelegationModal] = useState(false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showNewSoDModal, setShowNewSoDModal] = useState(false);
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<IamUser | null>(null);

  // Form states
  const [newUserForm, setNewUserForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    jobTitle: '',
    accountType: 'Employee' as IamUser['accountType'],
    mfaEnabled: true,
    biometricEnabled: false,
    companyCode: 'KAS',
  });

  const [newDelegationForm, setNewDelegationForm] = useState({
    fromUserEmail: '',
    toUserEmail: '',
    companyCode: 'KAS',
    reason: 'إجازة سنوية واعتيادية',
    validFrom: new Date().toISOString().split('T')[0],
    validTo: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
  });

  const [newSoDForm, setNewSoDForm] = useState({
    name: '',
    description: '',
    permissionA: 'vendor.create',
    permissionB: 'payment.release',
    riskLevel: 'حرج' as IamSoDRule['riskLevel'],
  });

  // Load Real IAM Data
  const loadAllIamData = async () => {
    setLoading(true);
    try {
      const [
        uList, cList, bList, dList, rList, pList, delList, sodList, reqList, revList, sessList, logList
      ] = await Promise.all([
        iamPolicyEngine.getUsers(),
        iamPolicyEngine.getCompanies(),
        iamPolicyEngine.getBranches(),
        iamPolicyEngine.getDepartments(),
        iamPolicyEngine.getRoles(),
        iamPolicyEngine.getPermissions(),
        iamPolicyEngine.getDelegations(),
        iamPolicyEngine.getSoDRules(),
        iamPolicyEngine.getAccessRequests(),
        iamPolicyEngine.getAccessReviews(),
        iamPolicyEngine.getActiveSessions(),
        iamPolicyEngine.getAuditLogs(100),
      ]);

      if (uList.length > 0) setUsers(uList);
      if (cList.length > 0) setCompanies(cList);
      if (bList.length > 0) setBranches(bList);
      if (dList.length > 0) setDepartments(dList);
      if (rList.length > 0) setRoles(rList);
      if (pList.length > 0) setPermissions(pList);
      if (delList.length > 0) setDelegations(delList);
      if (sodList.length > 0) setSodRules(sodList);
      if (reqList.length > 0) setAccessRequests(reqList);
      if (revList.length > 0) setAccessReviews(revList);
      if (sessList.length > 0) setSessions(sessList);
      if (logList.length > 0) setAuditLogs(logList);
    } catch (err) {
      console.warn('Error loading IAM data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllIamData();
  }, []);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchQuery = 
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.employeeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());

      const matchType = filterAccountType === 'all' || u.accountType === filterAccountType;
      const matchStatus = filterStatus === 'all' || u.status === filterStatus;

      return matchQuery && matchType && matchStatus;
    });
  }, [users, searchQuery, filterAccountType, filterStatus]);

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.fullName || !newUserForm.email) return;

    try {
      const created = await iamPolicyEngine.saveUser({
        fullName: newUserForm.fullName,
        email: newUserForm.email,
        phone: newUserForm.phone,
        jobTitle: newUserForm.jobTitle || 'موظف تشغيلي',
        accountType: newUserForm.accountType,
        mfaEnabled: newUserForm.mfaEnabled,
        biometricEnabled: newUserForm.biometricEnabled,
        status: 'نشط',
      });

      setUsers([created, ...users]);
      setShowNewUserModal(false);
      await logAuditAction('USER_CREATE', 'iam_users', 'SUCCESS', created.id, { email: created.email });
      addNotification({
        title: 'إنشاء حساب موظف',
        message: `تم إنشاء حساب الموظف (${created.fullName}) بنجاح وإسناد نطاق الأمان.`,
        type: 'success',
      });
    } catch (err: any) {
      addNotification({
        title: 'خطأ في الإنشاء',
        message: err?.message || 'تعذر إنشاء الحساب',
        type: 'error',
      });
    }
  };

  // Handle Toggle User Status
  const handleToggleUserStatus = async (user: IamUser) => {
    const newStatus: IamUser['status'] = user.status === 'نشط' ? 'موقوف' : 'نشط';
    try {
      const updated = await iamPolicyEngine.saveUser({ ...user, status: newStatus });
      setUsers(users.map(u => u.id === user.id ? updated : u));
      await logAuditAction('USER_STATUS_CHANGE', 'iam_users', 'SUCCESS', user.id, { oldStatus: user.status, newStatus });
      addNotification({
        title: 'تحديث حالة الحساب',
        message: `تم تغيير حالة المستخدم (${user.fullName}) إلى ${newStatus}.`,
        type: 'info',
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  // Handle Create SoD Rule
  const handleCreateSoD = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSoDForm.name || !newSoDForm.description) return;

    const newRule: IamSoDRule = {
      id: `sod-${Date.now()}`,
      code: `SOD-${String(sodRules.length + 1).padStart(3, '0')}`,
      name: newSoDForm.name,
      description: newSoDForm.description,
      permissionA: newSoDForm.permissionA,
      permissionB: newSoDForm.permissionB,
      riskLevel: newSoDForm.riskLevel,
      status: 'نشط',
    };

    setSodRules([newRule, ...sodRules]);
    setShowNewSoDModal(false);
    await logAuditAction('SOD_RULE_CREATE', 'iam_sod_rules', 'SUCCESS', newRule.id, newRule);
    addNotification({
      title: 'إضافة قاعدة فصل مهام SoD',
      message: `تم تعريف قاعدة الرقابة (${newRule.name}) بنجاح.`,
      type: 'success',
    });
  };

  // Handle Create Delegation
  const handleCreateDelegation = async (e: React.FormEvent) => {
    e.preventDefault();
    const fromUser = users.find(u => u.email === newDelegationForm.fromUserEmail);
    const toUser = users.find(u => u.email === newDelegationForm.toUserEmail);

    if (!fromUser || !toUser) {
      addNotification({ title: 'خطأ', message: 'يرجى التأكد من البريد الإلكتروني للمفوض والمفوض إليه', type: 'error' });
      return;
    }

    try {
      const targetCompany = companies.find(c => c.code === newDelegationForm.companyCode) || companies[0];
      const created = await iamPolicyEngine.createDelegation({
        fromUserId: fromUser.id,
        toUserId: toUser.id,
        companyId: targetCompany.id,
        permissionsScope: ['*'],
        reason: newDelegationForm.reason,
        validFrom: newDelegationForm.validFrom,
        validTo: newDelegationForm.validTo,
        status: 'نشط',
      });

      setDelegations([created, ...delegations]);
      setShowNewDelegationModal(false);
      await logAuditAction('DELEGATION_CREATE', 'iam_delegations', 'SUCCESS', created.id, created);
      addNotification({
        title: 'اعتماد تفويض مؤقت',
        message: `تم تفويض صلاحيات (${fromUser.fullName}) إلى (${toUser.fullName}) للفترة المحددة.`,
        type: 'success',
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 lg:p-8 font-sans space-y-6" dir="rtl">
      {/* Top Breadcrumb & Hero Banner */}
      <div className="bg-[#000000] bg-gradient-to-l from-zinc-900 via-slate-900 to-black border border-white/10 rounded-3xl p-6 lg:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-champagne/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <BusinessIllustration type="iam-security" size="sm" />
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-black tracking-wider text-champagne-light uppercase bg-black/80 px-3 py-1 rounded-full w-max border border-champagne/40">
                <ShieldCheck className="w-4 h-4 text-champagne-light" />
                <span>نظام الأمان والرقابة المركزية (IAM & Multi-Company Governance)</span>
              </div>
              <h1 className="text-2xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                إدارة الهوية والصلاحيات متعددة الشركات والأقسام
              </h1>
              <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
                تطبيق بنية العزل الهرمي الصارم (Multi-Tenant)، مبدأ أقل الصلاحيات (Least Privilege)، 
                وفصل المهام الرقابي (Separation of Duties - SoD) لمجموعة خالد السليم.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-2xl flex items-center gap-3">
              <Building2 className="w-5 h-5 text-champagne-light" />
              <div className="text-right">
                <div className="text-[10px] text-slate-300">الشركة الحالية النشطة</div>
                <div className="text-sm font-black text-white">{activeCompany?.commercialName}</div>
              </div>
            </div>
            <button
              onClick={loadAllIamData}
              className="px-4 py-2.5 bg-[#CFA64A] hover:bg-[#A98232] text-black font-black text-xs rounded-2xl transition border border-[#CFA64A] flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
              title="تحديث البيانات اللحظية"
            >
              <RefreshCw className="w-4 h-4 text-black shrink-0" />
              <span>تحديث</span>
            </button>
          </div>
        </div>

        {/* 10 Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-6 mt-6 border-t border-white/10 text-xs font-bold">
          {[
            { id: 'users', label: 'المستخدمين (Users)', icon: Users, count: users.length },
            { id: 'companies', label: 'الشركات والفروع', icon: Building2, count: companies.length },
            { id: 'memberships', label: 'العضويات ونطاق الوصول', icon: Layers, count: users.length },
            { id: 'roles-matrix', label: 'مصفوفة الصلاحيات (RBAC)', icon: KeyRound, count: roles.length },
            { id: 'access-requests', label: 'طلبات الصلاحيات', icon: Send, count: accessRequests.length },
            { id: 'delegations', label: 'التفويضات والإجازات', icon: ArrowLeftRight, count: delegations.length },
            { id: 'sod-rules', label: 'فصل المهام (SoD Rules)', icon: ShieldAlert, count: sodRules.length },
            { id: 'access-reviews', label: 'المراجعات الدورية', icon: CheckCircle2, count: accessReviews.length },
            { id: 'sessions', label: 'الجلسات والأجهزة', icon: Smartphone, count: sessions.length },
            { id: 'audit-logs', label: 'سجل التدقيق (Audit Trail)', icon: Activity, count: auditLogs.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as IamTab)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#CFA64A] text-black font-black shadow-lg'
                    : 'bg-[#1D2428] text-white border border-white/15 hover:bg-zinc-800'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-black' : 'text-[#E4C77B]'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isActive ? 'bg-black text-[#E4C77B]' : 'bg-black/60 text-white'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: USERS MANAGEMENT (المستخدمون) */}
      {/* ==================================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Action & Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 lg:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="البحث بالاسم، البريد، الرقم الوظيفي، أو المسمى..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-champagne"
                />
              </div>

              <select
                value={filterAccountType}
                onChange={(e) => setFilterAccountType(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">كافة أنواع الحسابات</option>
                <option value="Group Super Admin">Group Super Admin</option>
                <option value="Board / Group Executive">Board / Group Executive</option>
                <option value="Company Admin">Company Admin</option>
                <option value="Branch Manager">Branch Manager</option>
                <option value="Department Manager">Department Manager</option>
                <option value="Employee">Employee</option>
                <option value="Auditor">Auditor</option>
                <option value="Shared Services">Shared Services</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2.5 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">كافة الحالات</option>
                <option value="نشط">نشط</option>
                <option value="موقوف">موقوف</option>
                <option value="معلق">معلق</option>
              </select>
            </div>

            <button
              onClick={() => setShowNewUserModal(true)}
              className="px-5 py-2.5 bg-champagne hover:bg-champagne-dark text-black text-xs font-bold rounded-2xl shadow transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              إضافة مستخدم جديد
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                    <th className="py-4 px-6">المستخدم / الرقم الوظيفي</th>
                    <th className="py-4 px-6">نوع الحساب والنطاق</th>
                    <th className="py-4 px-6">المسمى الوظيفي</th>
                    <th className="py-4 px-6 text-center">المصادقة الثنائية (MFA)</th>
                    <th className="py-4 px-6 text-center">البصمة البيومترية</th>
                    <th className="py-4 px-6 text-center">الحالة</th>
                    <th className="py-4 px-6 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <CorporateAvatar
                            size="sm"
                            name={u.fullName}
                            role={u.jobTitle}
                            email={u.email}
                            status={u.status === 'نشط' ? 'verified' : 'none'}
                          />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              {u.fullName}
                              {u.accountType === 'Group Super Admin' && (
                                <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black rounded border border-amber-500/20">
                                  SUPER ADMIN
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{u.email} • {u.employeeNumber}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg border border-slate-200 dark:border-slate-700">
                          {u.accountType}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-slate-700 dark:text-slate-300">
                        {u.jobTitle}
                      </td>

                      <td className="py-4 px-6 text-center">
                        {u.mfaEnabled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-champagne-pale text-champagne-dark rounded-full font-bold text-[10px] border border-champagne/30">
                            <CheckCircle2 className="w-3 h-3" />
                            {u.mfaMethod}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full font-bold text-[10px]">
                            معطل
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-center">
                        {u.biometricEnabled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 rounded-full font-bold text-[10px] border border-blue-200 dark:border-blue-800">
                            <Fingerprint className="w-3 h-3" />
                            {u.biometricType || 'Touch ID'}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-center">
                        <span className={`px-2.5 py-1 rounded-full font-black text-[10px] ${
                          u.status === 'نشط'
                            ? 'bg-champagne-pale text-champagne-dark border border-champagne/30'
                            : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                        }`}>
                          {u.status}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedUserForDetail(u)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition"
                            title="تفاصيل الصلاحيات"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className={`p-1.5 rounded-lg transition ${
                              u.status === 'نشط' 
                                ? 'hover:bg-red-50 dark:hover:bg-red-950 text-red-600' 
                                : 'hover:bg-champagne-pale text-champagne-dark'
                            }`}
                            title={u.status === 'نشط' ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                          >
                            {u.status === 'نشط' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
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

      {/* ==================================================================== */}
      {/* TAB 2: COMPANIES & BRANCHES (الشركات والفروع) */}
      {/* ==================================================================== */}
      {activeTab === 'companies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((comp) => (
            <div
              key={comp.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 hover:border-champagne/50 transition relative overflow-hidden"
            >
              <div
                className="absolute top-0 right-0 left-0 h-1.5"
                style={{ backgroundColor: comp.primaryColor || '#CFA64A' }}
              />

              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{comp.code}</span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                    {comp.commercialName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{comp.legalName}</p>
                </div>
                <span className="px-2.5 py-1 bg-champagne-pale text-champagne-dark text-[10px] font-bold rounded-full border border-champagne/30">
                  {comp.status}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>السجل التجاري:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{comp.crNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>الرقم الضريبي ZATCA:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{comp.vatNumber}</span>
                </div>
              </div>

              <button
                onClick={() => switchCompany(comp.code)}
                className="w-full py-2.5 bg-slate-100 hover:bg-black hover:text-white dark:bg-slate-800 dark:hover:bg-champagne dark:hover:text-black text-slate-700 dark:text-slate-300 text-xs font-bold rounded-2xl transition flex items-center justify-center gap-2"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                التبديل إلى هذه الشركة
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: MEMBERSHIPS & DATA SCOPE (العضويات ونطاق الوصول) */}
      {/* ==================================================================== */}
      {activeTab === 'memberships' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-champagne-dark" />
              العضويات المؤسسية ونطاق عزل البيانات (Multi-Company & Department Scope)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                  <th className="py-3 px-4">الموظف</th>
                  <th className="py-3 px-4">نوع الحساب</th>
                  <th className="py-3 px-4">نطاق عزل البيانات (Data Scope)</th>
                  <th className="py-3 px-4">الفروع والأقسام المصرحة</th>
                  <th className="py-3 px-4 text-center">إدارة النطاق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <CorporateAvatar
                          name={u.fullName}
                          role={u.jobTitle}
                          email={u.email}
                          size="sm"
                          status={u.status === 'نشط' ? 'online' : 'none'}
                        />
                        <span>{u.fullName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{u.accountType}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 bg-champagne-pale text-champagne-dark rounded-full font-bold text-[10.5px]">
                        {u.accountType === 'Group Super Admin' ? 'المستوى 6 — كامل المجموعة (Group)' : 'المستوى 3 — القسم والشركة المختصة'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{u.jobTitle}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedUserForDetail(u)}
                        className="px-3 py-1.5 bg-black text-[#E4C77B] rounded-xl font-bold text-[11px] hover:bg-zinc-800 cursor-pointer"
                      >
                        تعديل النطاق
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: ROLES & PERMISSIONS MATRIX (مصفوفة الصلاحيات) */}
      {/* ==================================================================== */}
      {activeTab === 'roles-matrix' && (
        <RolesPermissionsMatrixWidget />
      )}

      {/* ==================================================================== */}
      {/* TAB 5: ACCESS REQUESTS (طلبات الصلاحيات) */}
      {/* ==================================================================== */}
      {activeTab === 'access-requests' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-champagne-dark" />
              طلبات الصلاحيات والوصول الاستثنائي (Access Requests)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="py-3 px-4">رقم الطلب</th>
                  <th className="py-3 px-4">الموظف</th>
                  <th className="py-3 px-4">الأدوار المطلوبة</th>
                  <th className="py-3 px-4">المبرر التشغيلي</th>
                  <th className="py-3 px-4 text-center">الحالة</th>
                  <th className="py-3 px-4 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accessRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{req.requestNumber}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <CorporateAvatar
                          name={req.userName || req.userId}
                          size="xs"
                          status="online"
                        />
                        <span>{req.userName || req.userId}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{req.requestedRoles.join(', ')}</td>
                    <td className="py-3 px-4 text-slate-700">{req.justification}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        req.finalStatus === 'معتمد' ? 'bg-champagne-pale text-champagne-dark' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {req.finalStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {req.finalStatus !== 'معتمد' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setAccessRequests(prev => prev.map(r => r.id === req.id ? { ...r, finalStatus: 'معتمد', securityAdminStatus: 'معتمد' } : r));
                            addNotification({ title: 'اعتماد طلب صلاحية', message: `تم اعتماد طلب الصلاحية ${req.requestNumber} بنجاح.`, type: 'success' });
                          }}
                          className="px-3 py-1 bg-[#CFA64A] text-black rounded-xl font-bold text-[11px] cursor-pointer"
                        >
                          اعتماد الطلب
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-700 font-bold">معتمد ✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 6: DELEGATIONS & LEAVES (التفويضات والإجازات) */}
      {/* ==================================================================== */}
      {activeTab === 'delegations' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-champagne-dark" />
              سجل التفويضات المؤقتة والإجازات
            </h3>
            <button
              onClick={() => setShowNewDelegationModal(true)}
              className="px-4 py-2 bg-champagne hover:bg-champagne-dark text-black text-xs font-bold rounded-2xl shadow transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إنشاء تفويض مؤقت
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {delegations.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                لا توجد تفويضات نشطة حالياً.
              </div>
            ) : (
              delegations.map((d) => (
                <div key={d.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="px-2 py-0.5 bg-champagne-pale text-champagne-dark text-[10px] font-bold rounded-md">
                      {d.status}
                    </span>
                    <span className="text-[10px] text-slate-400">{d.validFrom} إلى {d.validTo}</span>
                  </div>
                  <div className="text-xs space-y-2">
                    {d.fromUserName && (
                      <div className="flex items-center gap-2">
                        <CorporateAvatar name={d.fromUserName} size="xs" status="verified" />
                        <span className="font-bold text-slate-700">من:</span> {d.fromUserName} ← <span className="font-bold">{d.toUserName}</span>
                      </div>
                    )}
                    <div><span className="font-bold text-slate-700 dark:text-slate-300">السبب:</span> {d.reason}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 7: SEPARATION OF DUTIES (فصل المهام SoD) */}
      {/* ==================================================================== */}
      {activeTab === 'sod-rules' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                قواعد فصل المهام المتعارضة (Separation of Duties - SoD)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                منع تضارب المصالح ومنع جمع صلاحيات الإنشاء والاعتماد والصرف في حساب واحد وفقاً للمعايير الرقابية.
              </p>
            </div>
            <button
              onClick={() => setShowNewSoDModal(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-2xl shadow transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إضافة قاعدة SoD جديدة
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sodRules.map((rule) => (
              <div key={rule.id} className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/40 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs font-black text-red-600 dark:text-red-400">{rule.code}</span>
                  <span className="px-2 py-0.5 bg-red-500/10 text-red-600 text-[10px] font-black rounded-md border border-red-500/20">
                    مستوى الخطر: {rule.riskLevel}
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">{rule.name}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{rule.description}</p>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1 text-[11px] font-mono">
                  <div className="text-slate-700 dark:text-slate-300">الصلاحية 1: <span className="text-red-500 font-bold">{rule.permissionA}</span></div>
                  <div className="text-slate-700 dark:text-slate-300">الصلاحية 2: <span className="text-red-500 font-bold">{rule.permissionB}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 8: ACCESS REVIEWS (المراجعات الدورية) */}
      {/* ==================================================================== */}
      {activeTab === 'access-reviews' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-champagne-dark" />
              حملات المراجعة الدورية للصلاحيات (Quarterly Access Reviews)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="py-3 px-4">اسم الحملة الرقابية</th>
                  <th className="py-3 px-4">الربع السنوي</th>
                  <th className="py-3 px-4">المراجع المسؤول</th>
                  <th className="py-3 px-4 text-center">عدد الحسابات المراجعة</th>
                  <th className="py-3 px-4 text-center">الصلاحيات المسحوبة</th>
                  <th className="py-3 px-4 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accessReviews.map((rev) => (
                  <tr key={rev.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{rev.campaignName}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{rev.quarter}</td>
                    <td className="py-3 px-4 text-slate-700">{rev.reviewerName || 'رئيس مجلس الإدارة'}</td>
                    <td className="py-3 px-4 text-center font-bold">{rev.totalUsersReviewed}</td>
                    <td className="py-3 px-4 text-center font-bold text-rose-600">{rev.revokedPermissionsCount}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-1 bg-champagne-pale text-champagne-dark rounded-full font-bold text-[10px]">
                        {rev.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 9: ACTIVE SESSIONS (الجلسات والأجهزة) */}
      {/* ==================================================================== */}
      {activeTab === 'sessions' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-champagne-dark" />
              الجلسات النشطة والأجهزة المتصلة (Active Sessions)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="py-3 px-4">المستخدم</th>
                  <th className="py-3 px-4">الشركة النشطة</th>
                  <th className="py-3 px-4">الجهاز والمتصفح</th>
                  <th className="py-3 px-4">عنوان IP</th>
                  <th className="py-3 px-4 text-center">الحالة</th>
                  <th className="py-3 px-4 text-center">إجراء أمني</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <CorporateAvatar
                          name={sess.userName || sess.userId}
                          size="xs"
                          status={sess.status === 'نشطة' ? 'online' : 'none'}
                        />
                        <span>{sess.userName || sess.userId}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-champagne-dark">{sess.companyCode || sess.activeCompanyId}</td>
                    <td className="py-3 px-4 text-slate-600">{sess.userAgent}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{sess.ipAddress}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        sess.status === 'نشطة' ? 'bg-champagne-pale text-champagne-dark' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {sess.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {sess.status === 'نشطة' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSessions(prev => prev.map(s => s.id === sess.id ? { ...s, status: 'ملغاة إجبارياً' } : s));
                            addNotification({ title: 'إنهاء الجلسة عن بُعد', message: `تم إنهاء جلسة (${sess.userName || sess.userId}) فوراً.`, type: 'warning' });
                          }}
                          className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-[11px] cursor-pointer"
                        >
                          إنهاء الجلسة
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 10: AUDIT TRAIL (سجل التدقيق الشامل) */}
      {/* ==================================================================== */}
      {activeTab === 'audit-logs' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-champagne-dark" />
              سجل التدقيق الأمني والامتثال (Immutable Audit Trail)
            </h3>
            <span className="text-xs text-slate-400 font-mono">آخر 100 حركة مسجلة</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                  <th className="py-3 px-4">الطابع الزمني</th>
                  <th className="py-3 px-4">المستخدم (Actor)</th>
                  <th className="py-3 px-4">الشركة</th>
                  <th className="py-3 px-4">الإجراء (Action)</th>
                  <th className="py-3 px-4">المورد (Resource)</th>
                  <th className="py-3 px-4 text-center">النتيجة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 text-slate-400">{log.createdAt.slice(0, 19).replace('T', ' ')}</td>
                    <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-sans font-bold">{log.actorEmail}</td>
                    <td className="py-3 px-4 text-champagne-dark font-bold">{log.companyCode || '—'}</td>
                    <td className="py-3 px-4 text-blue-600 dark:text-blue-400">{log.action}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{log.resource}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                        log.result === 'SUCCESS'
                          ? 'bg-champagne-pale text-champagne-dark border border-champagne/30'
                          : log.result === 'FORBIDDEN'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-red-500/10 text-red-600'
                      }`}>
                        {log.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NEW DELEGATION */}
      {showNewDelegationModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" dir="rtl">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">إنشاء تفويض صلاحيات مؤقت</h3>
              <button type="button" onClick={() => setShowNewDelegationModal(false)} className="text-slate-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateDelegation} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">المفوِّض (البريد الإلكتروني)</label>
                <select
                  value={newDelegationForm.fromUserEmail}
                  onChange={(e) => setNewDelegationForm({ ...newDelegationForm, fromUserEmail: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                >
                  {users.map(u => <option key={u.id} value={u.email}>{u.fullName} ({u.email})</option>)}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">المفوَّض إليه (البديل)</label>
                <select
                  value={newDelegationForm.toUserEmail}
                  onChange={(e) => setNewDelegationForm({ ...newDelegationForm, toUserEmail: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                >
                  {users.map(u => <option key={u.id} value={u.email}>{u.fullName} ({u.email})</option>)}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">السبب التشغيلي للتفويض</label>
                <input
                  type="text"
                  required
                  value={newDelegationForm.reason}
                  onChange={(e) => setNewDelegationForm({ ...newDelegationForm, reason: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowNewDelegationModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">إلغاء</button>
                <button type="submit" className="px-5 py-2 bg-[#CFA64A] text-black rounded-xl font-black">اعتماد التفويض</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW SOD RULE */}
      {showNewSoDModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" dir="rtl">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">إضافة قاعدة فصل مهام رقابية (SoD)</h3>
              <button type="button" onClick={() => setShowNewSoDModal(false)} className="text-slate-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSoD} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم القاعدة الرقابية *</label>
                <input
                  type="text"
                  required
                  value={newSoDForm.name}
                  onChange={(e) => setNewSoDForm({ ...newSoDForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  placeholder="مثال: فصل اعتماد مسير الرواتب عن تعديل الآيبان"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">الوصف والضابط الرقابي *</label>
                <input
                  type="text"
                  required
                  value={newSoDForm.description}
                  onChange={(e) => setNewSoDForm({ ...newSoDForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  placeholder="وصف التعارض الرقابي..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowNewSoDModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">إلغاء</button>
                <button type="submit" className="px-5 py-2 bg-red-600 text-white rounded-xl font-black">حفظ القاعدة</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW USER */}
      {showNewUserModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" dir="rtl">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 lg:p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-champagne-dark" />
                إضافة مستخدم وموظف جديد للمنظومة
              </h3>
              <button onClick={() => setShowNewUserModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">الاسم الرباعي الكامل *</label>
                  <input
                    type="text"
                    required
                    value={newUserForm.fullName}
                    onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5"
                    placeholder="مثال: فهد بن إبراهيم السليم"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">البريد الإلكتروني المهني *</label>
                  <input
                    type="email"
                    required
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5"
                    placeholder="fahad@alsulaim.sa"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">المسمى الوظيفي</label>
                  <input
                    type="text"
                    value={newUserForm.jobTitle}
                    onChange={(e) => setNewUserForm({ ...newUserForm, jobTitle: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5"
                    placeholder="أخصائي شؤون مالية"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">نوع الحساب ونطاق الدور</label>
                  <select
                    value={newUserForm.accountType}
                    onChange={(e) => setNewUserForm({ ...newUserForm, accountType: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5"
                  >
                    <option value="Employee">Employee (موظف تشغيلي)</option>
                    <option value="Department Manager">Department Manager (مدير قسم)</option>
                    <option value="Branch Manager">Branch Manager (مدير فرع)</option>
                    <option value="Company Admin">Company Admin (مدير شركة)</option>
                    <option value="Shared Services">Shared Services (خدمات مشتركة)</option>
                    <option value="Auditor">Auditor (مدقق رقابي)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUserForm.mfaEnabled}
                    onChange={(e) => setNewUserForm({ ...newUserForm, mfaEnabled: e.target.checked })}
                    className="rounded text-champagne focus:ring-champagne w-4 h-4"
                  />
                  <span className="font-bold text-slate-700 dark:text-slate-300">إلزام المصادقة الثنائية (MFA)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUserForm.biometricEnabled}
                    onChange={(e) => setNewUserForm({ ...newUserForm, biometricEnabled: e.target.checked })}
                    className="rounded text-champagne focus:ring-champagne w-4 h-4"
                  />
                  <span className="font-bold text-slate-700 dark:text-slate-300">تفعيل البصمة البيومترية (Touch/Face ID)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewUserModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl transition font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-champagne hover:bg-champagne-dark text-black rounded-2xl shadow transition font-black"
                >
                  إنشاء الحساب فوراً
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: USER SCOPE & PERMISSIONS EDIT */}
      {selectedUserForDetail && (
        <UserScopeEditModal
          user={selectedUserForDetail}
          onClose={() => setSelectedUserForDetail(null)}
          onSave={(updatedUser) => {
            setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
            iamPolicyEngine.saveUser(updatedUser);
            setSelectedUserForDetail(null);
          }}
        />
      )}
    </div>
  );
};
