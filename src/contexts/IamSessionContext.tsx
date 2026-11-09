import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  IamUser, 
  IamCompany, 
  IamMembership, 
  IamRole, 
  IamDelegation, 
  IamSessionContext as IamSessionContextType,
  AccountType,
  DataScopeLevel,
  DataScopeName,
  ModuleAction,
  RecordAccessContext,
  DEFAULT_IAM_COMPANIES
} from '../types/iam';
import { iamPolicyEngine } from '../services/iamPolicyEngine';

import { authService, UserProfile } from '../services/authService';

const IamContext = createContext<IamSessionContextType | undefined>(undefined);

// 4 Official Corporate Group Companies
const DEFAULT_COMPANIES: IamCompany[] = DEFAULT_IAM_COMPANIES;

const DATA_SCOPE_NAMES: Record<DataScopeLevel, DataScopeName> = {
  0: 'No Access',
  1: 'Own',
  2: 'Team',
  3: 'Department',
  4: 'Branch',
  5: 'Company',
  6: 'Group',
};

const ALL_ADMIN_PERMISSIONS = [
  '*',
  'dashboard.view',
  'group.dashboard.view',
  'recruitment.view',
  'recruitment.create',
  'recruitment.edit',
  'recruitment.approve',
  'recruitment.export',
  'hr.view',
  'hr.create',
  'hr.edit',
  'hr.delete',
  'hr.export',
  'finance.view',
  'finance.create',
  'finance.edit',
  'finance.approve',
  'finance.export',
  'rent.view',
  'rent.create',
  'rent.edit',
  'rent.approve',
  'tenders.view',
  'tenders.create',
  'tenders.edit',
  'tenders.approve',
  'shelter.view',
  'shelter.create',
  'shelter.edit',
  'shelter.export',
  'iam.view',
  'iam.manage',
  'settings.view',
  'settings.edit',
  'audit.view',
  'audit.export',
];

function mapProfileToIamUser(profile: UserProfile | null): {
  iamUser: IamUser | null;
  permissions: Set<string>;
} {
  if (!profile) {
    return { iamUser: null, permissions: new Set<string>() };
  }

  let accountType: AccountType = 'Department Manager';
  let scope: DataScopeLevel = 3;
  let perms: string[] = [];

  const dept = profile.department_id;

  if (
    dept === 'executive' ||
    profile.company_id === 'all' ||
    ['رئيس مجلس الإدارة', 'رئيس المجموعة', 'مدير نظام', 'مدير تنفيذي'].includes(profile.role)
  ) {
    accountType = 'Group Super Admin';
    scope = 6;
    perms = ALL_ADMIN_PERMISSIONS;
  } else if (dept === 'finance' || authService.isFinance(profile)) {
    accountType = 'Department Manager';
    scope = 3;
    perms = ['finance.*', 'finance.view', 'finance.create', 'finance.edit', 'finance.approve', 'finance.export'];
  } else if (dept === 'recruitment') {
    accountType = 'Department Manager';
    scope = 3;
    perms = ['recruitment.*', 'recruitment.view', 'recruitment.create', 'recruitment.edit', 'travel.view', 'transfer.view'];
  } else if (dept === 'rental') {
    accountType = 'Department Manager';
    scope = 3;
    perms = ['rent.*', 'rent.view', 'rent.create', 'rent.edit'];
  } else if (dept === 'ats') {
    accountType = 'Department Manager';
    scope = 3;
    perms = ['ats.view', 'agents.view'];
  } else if (dept === 'hr' || authService.isHR(profile)) {
    accountType = 'Department Manager';
    scope = 3;
    perms = ['hr.*', 'hr.view', 'hr.create', 'hr.edit', 'hr.export'];
  } else if (dept === 'crm' || authService.isCustomerService(profile)) {
    accountType = 'Department Manager';
    scope = 3;
    perms = ['crm.*', 'crm.view', 'crm.create', 'crm.edit'];
  } else if (dept === 'shelter') {
    accountType = 'Department Manager';
    scope = 3;
    perms = ['shelter.*', 'shelter.view', 'shelter.create', 'shelter.edit'];
  } else if (dept === 'tenders') {
    accountType = 'Department Manager';
    scope = 3;
    perms = ['tenders.*', 'tenders.view', 'tenders.create', 'tenders.edit', 'tenders.approve'];
  } else {
    accountType = 'Employee';
    scope = 3;
    perms = ['recruitment.view'];
  }

  return {
    iamUser: {
      id: profile.id,
      employeeNumber: `EMP-${profile.id.slice(0, 4).toUpperCase()}`,
      fullName: profile.full_name,
      username: profile.username,
      email: profile.email,
      phone: '',
      jobTitle: profile.role,
      accountType,
      status: 'نشط',
      dataScope: scope,
      mfaEnabled: true,
      mfaMethod: 'Google Authenticator',
      biometricEnabled: true,
      biometricType: 'بصمة مزدوجة',
      sessionTimeoutMinutes: 45,
    },
    permissions: new Set(perms),
  };
}

export const IamSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialMapped = mapProfileToIamUser(authService.getCurrentUser());
  const [currentUser, setCurrentUser] = useState<IamUser | null>(initialMapped.iamUser);
  const [companies, setCompanies] = useState<IamCompany[]>(DEFAULT_COMPANIES);
  const [activeCompanyCode, setActiveCompanyCode] = useState<string>(
    authService.getCurrentUser()?.company_id && authService.getCurrentUser()?.company_id !== 'all'
      ? authService.getCurrentUser()!.company_id!
      : 'SAF'
  );
  const [userMemberships, setUserMemberships] = useState<IamMembership[]>([]);
  const [activeRoles, setActiveRoles] = useState<IamRole[]>([]);
  const [delegations, setDelegations] = useState<IamDelegation[]>([]);
  const [permissionCodes, setPermissionCodes] = useState<Set<string>>(initialMapped.permissions);

  // Sync IAM session state with Auth state changes and direct department login
  useEffect(() => {
    let isMounted = true;

    const syncFromProfile = async (profile: UserProfile | null) => {
      if (!isMounted) return;
      const mapped = mapProfileToIamUser(profile);
      setCurrentUser(mapped.iamUser);
      setPermissionCodes(mapped.permissions);

      if (profile?.company_id && profile.company_id !== 'all') {
        setActiveCompanyCode(profile.company_id.toUpperCase());
      }

      if (profile?.id && !profile.id.startsWith('USR-')) {
        const memberships = await iamPolicyEngine.getUserMemberships(profile.id);
        if (isMounted && memberships.length > 0) {
          setUserMemberships(memberships);
        }
      } else {
        setUserMemberships([]);
      }
    };

    void syncFromProfile(authService.getCurrentUser());

    const { data: { subscription } } = authService.onAuthStateChange((_event, session) => {
      const nextProfile: UserProfile | null = session?.user?.profile || authService.getCurrentUser();
      void syncFromProfile(nextProfile);
    });

    const handleDirectUpdate = (e: any) => {
      const nextProfile: UserProfile | null = e.detail?.profile ?? authService.getCurrentUser();
      void syncFromProfile(nextProfile);
    };
    window.addEventListener('alsulaim-auth-updated', handleDirectUpdate);

    iamPolicyEngine.getCompanies().then((realCos) => {
      if (isMounted && realCos.length > 0) {
        setCompanies(realCos);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener('alsulaim-auth-updated', handleDirectUpdate);
    };
  }, []);

  const activeCompany = useMemo(() => {
    return companies.find(c => c.code === activeCompanyCode) || companies[0] || DEFAULT_COMPANIES[0];
  }, [companies, activeCompanyCode]);

  const activeMembership = useMemo(() => {
    if (!currentUser) return null;
    if (userMemberships.length > 0) {
      return userMemberships.find(m => m.companyId === activeCompany?.id || m.companyCode === activeCompany?.code) || null;
    }
    const effectiveScope = (currentUser.accountType === 'Group Super Admin' ? 6 : (currentUser.dataScope ?? 4)) as DataScopeLevel;
    return {
      id: `mem-${currentUser.id}-${activeCompany?.code}`,
      userId: currentUser.id,
      companyId: activeCompany?.id || '',
      companyCode: activeCompany?.code,
      companyName: activeCompany?.legalName,
      dataScope: effectiveScope,
      dataScopeName: DATA_SCOPE_NAMES[effectiveScope],
      branchScope: ['*'],
      departmentScope: ['*'],
      isPrimary: true,
      status: 'نشط' as const,
      validFrom: '2026-01-01',
    };
  }, [userMemberships, activeCompany, currentUser]);

  const dataScope: DataScopeLevel = useMemo(() => {
    if (!currentUser) return 0;
    if (currentUser.accountType === 'Group Super Admin') return 6;
    if (activeMembership?.dataScope !== undefined) return activeMembership.dataScope;
    return (currentUser.dataScope ?? 4) as DataScopeLevel;
  }, [currentUser, activeMembership]);

  const dataScopeName: DataScopeName = DATA_SCOPE_NAMES[dataScope] || 'Company';

  const allowedCompanyIds: string[] = useMemo(() => {
    if (currentUser?.accountType === 'Group Super Admin' || currentUser?.accountType === 'Board / Group Executive') {
      return ['*', ...companies.map(c => c.id), ...companies.map(c => c.code)];
    }
    if (userMemberships.length > 0) {
      return userMemberships.map(m => m.companyId);
    }
    return [activeCompany?.id || ''];
  }, [currentUser, companies, userMemberships, activeCompany]);

  const allowedBranchIds: string[] = useMemo(() => {
    if (currentUser?.accountType === 'Group Super Admin' || currentUser?.accountType === 'Board / Group Executive') {
      return ['*'];
    }
    return activeMembership?.branchScope || ['*'];
  }, [currentUser, activeMembership]);

  const allowedDepartmentIds: string[] = useMemo(() => {
    if (currentUser?.accountType === 'Group Super Admin' || currentUser?.accountType === 'Board / Group Executive') {
      return ['*'];
    }
    return activeMembership?.departmentScope || ['*'];
  }, [currentUser, activeMembership]);

  const isSuperAdmin = currentUser?.accountType === 'Group Super Admin';
  const isBoardExecutive = currentUser?.accountType === 'Board / Group Executive';
  const isCompanyAdmin = isSuperAdmin || isBoardExecutive || currentUser?.accountType === 'Company Admin';
  const isBranchManager = currentUser?.accountType === 'Branch Manager';
  const isDepartmentManager = currentUser?.accountType === 'Department Manager';
  const canSwitchCompany = isSuperAdmin || isBoardExecutive || userMemberships.length > 1;

  // Single Permission Check
  const hasPermission = useCallback((permissionCode: string): boolean => {
    if (isSuperAdmin) return true; // Technical Super Admin unrestricted access
    if (permissionCodes.has('*')) return true;
    if (permissionCodes.has(permissionCode)) return true;

    // Check wildcard module permissions like 'hr.*'
    const parts = permissionCode.split('.');
    if (parts.length > 1 && permissionCodes.has(`${parts[0]}.*`)) {
      return true;
    }
    return false;
  }, [isSuperAdmin, permissionCodes]);

  // Evaluates Full 8-Stage Multi-Entity Decision Flow
  const canPerform = useCallback((module: string, action: ModuleAction, recordContext?: RecordAccessContext): boolean => {
    const decision = iamPolicyEngine.evaluateAccessDecision(
      {
        user: currentUser,
        activeTenantId: activeCompany?.tenantId || '11111111-1111-1111-1111-111111111111',
        activeCompanyId: activeCompany?.id || '',
        allowedCompanyIds,
        allowedBranchIds,
        allowedDepartmentIds,
        dataScope,
        permissionCodes,
      },
      module,
      action,
      recordContext
    );
    return decision.allowed;
  }, [currentUser, activeCompany, allowedCompanyIds, allowedBranchIds, allowedDepartmentIds, dataScope, permissionCodes]);

  const canAccessBranch = useCallback((branchId: string): boolean => {
    if (isSuperAdmin || isBoardExecutive) return true;
    if (allowedBranchIds.includes('*')) return true;
    return allowedBranchIds.includes(branchId);
  }, [isSuperAdmin, isBoardExecutive, allowedBranchIds]);

  const canAccessDepartment = useCallback((deptId: string): boolean => {
    if (isSuperAdmin || isBoardExecutive) return true;
    if (allowedDepartmentIds.includes('*')) return true;
    return allowedDepartmentIds.includes(deptId);
  }, [isSuperAdmin, isBoardExecutive, allowedDepartmentIds]);

  // Filter records by Active Company and Data Scope
  const filterRecords = useCallback(<T extends RecordAccessContext>(records: T[]): T[] => {
    return iamPolicyEngine.filterRecordsByScope(records, {
      user: currentUser,
      activeCompanyId: activeCompany?.id || '',
      allowedBranchIds,
      allowedDepartmentIds,
      dataScope,
      isSuperAdmin,
    });
  }, [currentUser, activeCompany, allowedBranchIds, allowedDepartmentIds, dataScope, isSuperAdmin]);

  // Safe Company Switch with Zero Privilege Leakage
  const switchCompany = async (newCompanyCodeOrId: string): Promise<boolean> => {
    const target = companies.find(c => c.code === newCompanyCodeOrId || c.id === newCompanyCodeOrId);
    if (!target) return false;

    // Check authorization to switch
    const isAuthorized = isSuperAdmin || 
                         isBoardExecutive || 
                         allowedCompanyIds.includes('*') || 
                         allowedCompanyIds.includes(target.id) || 
                         allowedCompanyIds.includes(target.code);

    if (!isAuthorized) {
      await iamPolicyEngine.logAudit({
        actorId: currentUser?.id,
        actorEmail: currentUser?.email || 'unknown',
        companyId: target.id,
        companyCode: target.code,
        action: 'COMPANY_ACCESS_FORBIDDEN',
        resource: 'iam_companies',
        recordId: target.id,
        result: 'FORBIDDEN',
        severity: 'خطر أمني',
      });
      return false;
    }

    const previousCompany = activeCompanyCode;
    setActiveCompanyCode(target.code);

    // Record Company Switch in Audit Log
    await iamPolicyEngine.logAudit({
      actorId: currentUser?.id,
      actorEmail: currentUser?.email || 'unknown',
      companyId: target.id,
      companyCode: target.code,
      action: 'COMPANY_SWITCH',
      resource: 'iam_companies',
      recordId: target.id,
      result: 'SUCCESS',
      severity: 'معلومات',
      oldValues: { fromCompany: previousCompany },
      newValues: { toCompany: target.code },
    });

    return true;
  };

  const logAuditAction = async (
    action: string,
    resource: string,
    result: 'SUCCESS' | 'FORBIDDEN' | 'FAILED',
    recordId?: string,
    details?: any
  ): Promise<void> => {
    await iamPolicyEngine.logAudit({
      actorId: currentUser?.id,
      actorEmail: currentUser?.email || 'unknown',
      companyId: activeCompany?.id,
      companyCode: activeCompany?.code,
      action,
      resource,
      recordId,
      result,
      severity: result === 'FORBIDDEN' ? 'تحذير' : 'معلومات',
      newValues: details,
    });
  };

  const value: IamSessionContextType = {
    currentUser,
    activeTenantId: activeCompany?.tenantId || '11111111-1111-1111-1111-111111111111',
    activeCompanyId: activeCompany?.id || '',
    activeCompany,
    allowedCompanyIds,
    allowedBranchIds,
    allowedDepartmentIds,
    dataScope,
    dataScopeName,
    userMemberships,
    activeMembership,
    activeRoles,
    permissionCodes,
    delegations,
    isSuperAdmin,
    isBoardExecutive,
    isCompanyAdmin,
    isBranchManager,
    isDepartmentManager,
    canSwitchCompany,
    switchCompany,
    hasPermission,
    canPerform,
    canAccessBranch,
    canAccessDepartment,
    filterRecords,
    logAuditAction,
  };

  return <IamContext.Provider value={value}>{children}</IamContext.Provider>;
};

export const useIamSession = (): IamSessionContextType => {
  const context = useContext(IamContext);
  if (!context) {
    throw new Error('useIamSession must be used within an IamSessionProvider');
  }
  return context;
};
