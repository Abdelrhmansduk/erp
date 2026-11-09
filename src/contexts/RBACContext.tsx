import React, { createContext, useContext, useState, useEffect } from 'react';
import { CompanyId, RoleType, PermissionAction, UserPermission } from '../types';
import { useCompany, normalizeCompanyId } from './CompanyContext';
import { authService, UserProfile } from '../services/authService';

export interface UserRoleProfile {
  id: string;
  name: string;
  role: RoleType;
  primaryCompanyId: CompanyId;
  allowedCompanyIds: CompanyId[]; // 'all' or list of company IDs
  permissions: UserPermission[];
}

const GUEST_RESTRICTED_PROFILE: UserRoleProfile = {
  id: 'unauthenticated',
  name: 'زائر غير مصادق',
  role: 'VIEWER',
  primaryCompanyId: 'SAF',
  allowedCompanyIds: [],
  permissions: [],
};

function buildRoleProfileFromAuthUser(user: UserProfile | null): UserRoleProfile {
  if (!user) return GUEST_RESTRICTED_PROFILE;

  const assignedCompany = normalizeCompanyId((user.company_id as CompanyId) || 'SAF');

  if (authService.isAdmin(user)) {
    return {
      id: user.id,
      name: user.full_name,
      role: 'SUPER_ADMIN',
      primaryCompanyId: 'all',
      allowedCompanyIds: ['all', 'SAF', 'YAQ', 'TOP', 'DAR', 'KAS'],
      permissions: [
        {
          module: '*',
          actions: ['view', 'create', 'edit', 'approve', 'post', 'cancel', 'export', 'print', 'download', 'share', 'delete'],
          scope: 'GROUP',
        },
      ],
    };
  }

  if (authService.isFinance(user)) {
    return {
      id: user.id,
      name: user.full_name,
      role: user.role === 'مدير مالي' ? 'GROUP_FINANCE' : 'ACCOUNTANT',
      primaryCompanyId: assignedCompany,
      allowedCompanyIds: user.role === 'مدير مالي' ? ['all', 'SAF', 'YAQ', 'TOP', 'DAR', 'KAS'] : [assignedCompany],
      permissions: [
        {
          module: 'finance',
          actions: ['view', 'create', 'edit', 'approve', 'post', 'export', 'print', 'download'],
          scope: user.role === 'مدير مالي' ? 'GROUP' : 'COMPANY',
          companyId: assignedCompany,
        },
        {
          module: '*',
          actions: ['view', 'print', 'export'],
          scope: 'COMPANY',
          companyId: assignedCompany,
        },
      ],
    };
  }

  if (authService.isHR(user)) {
    return {
      id: user.id,
      name: user.full_name,
      role: 'GROUP_HR',
      primaryCompanyId: assignedCompany,
      allowedCompanyIds: [assignedCompany],
      permissions: [
        {
          module: 'hr',
          actions: ['view', 'create', 'edit', 'approve', 'export', 'print'],
          scope: 'COMPANY',
          companyId: assignedCompany,
        },
      ],
    };
  }

  return {
    id: user.id,
    name: user.full_name,
    role: 'OPERATIONS_OFFICER',
    primaryCompanyId: assignedCompany,
    allowedCompanyIds: [assignedCompany],
    permissions: [
      {
        module: '*',
        actions: ['view', 'create', 'edit', 'print'],
        scope: 'COMPANY',
        companyId: assignedCompany,
      },
    ],
  };
}

interface RBACContextType {
  currentRoleProfile: UserRoleProfile;
  setRoleProfile: (profile: UserRoleProfile) => void;
  hasPermission: (module: string, action: PermissionAction, targetCompanyId?: CompanyId) => boolean;
  canAccessCompany: (companyId: CompanyId) => boolean;
  requiresMultiApproval: (module: string, amount?: number) => boolean;
  isSuperAdmin: boolean;
  isGroupLevel: boolean;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

export const RBACProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRoleProfile, setRoleProfile] = useState<UserRoleProfile>(() =>
    buildRoleProfileFromAuthUser(authService.getCurrentUser())
  );
  const { activeCompanyId } = useCompany();

  useEffect(() => {
    const syncRole = (profile: UserProfile | null) => {
      setRoleProfile(buildRoleProfileFromAuthUser(profile));
    };
    syncRole(authService.getCurrentUser());
    const { data: { subscription } } = authService.onAuthStateChange((_event, session) => {
      syncRole(session?.user?.profile || authService.getCurrentUser());
    });
    const handleDirectAuthUpdate = (e: any) => {
      syncRole(e.detail?.profile ?? authService.getCurrentUser());
    };
    window.addEventListener('alsulaim-auth-updated', handleDirectAuthUpdate);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('alsulaim-auth-updated', handleDirectAuthUpdate);
    };
  }, []);

  const isSuperAdmin = currentRoleProfile.role === 'SUPER_ADMIN';

  const isGroupLevel =
    isSuperAdmin ||
    currentRoleProfile.role === 'GROUP_ADMIN' ||
    currentRoleProfile.role === 'GROUP_FINANCE' ||
    currentRoleProfile.role === 'GROUP_HR';

  const canAccessCompany = (targetCompanyId: CompanyId): boolean => {
    if (isSuperAdmin || currentRoleProfile.allowedCompanyIds.includes('all')) return true;
    return currentRoleProfile.allowedCompanyIds.includes(targetCompanyId);
  };

  const hasPermission = (module: string, action: PermissionAction, targetCompanyId?: CompanyId): boolean => {
    if (isSuperAdmin) return true;

    const companyToTest = targetCompanyId || activeCompanyId;
    if (!canAccessCompany(companyToTest)) return false;

    // Search permissions array
    const matched = currentRoleProfile.permissions.find(
      (p) => (p.module === '*' || p.module === module) && p.actions.includes(action)
    );

    if (!matched) return false;

    if (matched.scope === 'GROUP' || isGroupLevel) return true;
    if (matched.scope === 'COMPANY') {
      return matched.companyId === companyToTest || currentRoleProfile.primaryCompanyId === companyToTest;
    }

    return true;
  };

  const requiresMultiApproval = (module: string, amount?: number): boolean => {
    if (isSuperAdmin) return false;
    // Tenders > 100,000 SAR require multi-approval
    if (module === 'tenders' && amount && amount > 100000) return true;
    // Financial postings > 50,000 SAR require multi-approval
    if (module === 'finance' && amount && amount > 50000) return true;
    return false;
  };

  return (
    <RBACContext.Provider
      value={{
        currentRoleProfile,
        setRoleProfile,
        hasPermission,
        canAccessCompany,
        requiresMultiApproval,
        isSuperAdmin,
        isGroupLevel,
      }}
    >
      {children}
    </RBACContext.Provider>
  );
};

export const useRBAC = (): RBACContextType => {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  return context;
};
