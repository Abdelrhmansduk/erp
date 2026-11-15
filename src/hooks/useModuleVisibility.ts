import { useCallback, useEffect, useMemo } from 'react';
import { SIDEBAR_MENU } from '../data/sidebarMenu';
import type { NavItem } from '../types';
import { useAuthContext } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { authService } from '../services/authService';
import {
  useModuleVisibilityStore,
  resolveUserVisibilityAccess,
  isVisibilityControllerUser,
  VISIBILITY_SCOPES,
  type VisibilityScope,
} from '../services/moduleVisibility';

let remoteLoadStarted = false;

function toScope(value?: string | null): VisibilityScope | null {
  const upper = String(value || '').toUpperCase() as VisibilityScope;
  return VISIBILITY_SCOPES.includes(upper) ? upper : null;
}

/**
 * Effective visibility for the signed-in employee
 * (Org rules -> Department rules -> Abdulrahman's Per-Employee rules -> Personal rules).
 */
export function useModuleVisibility() {
  const { user } = useAuthContext();
  const { activeCompanyId } = useCompany();
  const orgRules = useModuleVisibilityStore((s) => s.orgRules);
  const departmentRules = useModuleVisibilityStore((s) => s.departmentRules);
  const employeeRules = useModuleVisibilityStore((s) => s.employeeRules);
  const personalRules = useModuleVisibilityStore((s) => s.personalRules);
  const loadRemoteRules = useModuleVisibilityStore((s) => s.loadRemoteRules);

  useEffect(() => {
    if (!user || remoteLoadStarted) return;
    remoteLoadStarted = true;
    void loadRemoteRules();
  }, [user, loadRemoteRules]);

  const companyScope = useMemo<VisibilityScope | null>(() => {
    const own = toScope(user?.company_id);
    if (own && own !== 'ALL') return own;
    // Group-level accounts follow the company they are currently viewing.
    return toScope(activeCompanyId as string);
  }, [user?.company_id, activeCompanyId]);

  const resolved = useMemo(
    () =>
      resolveUserVisibilityAccess(SIDEBAR_MENU, user, activeCompanyId as string, {
        orgRules,
        departmentRules,
        employeeRules,
        personalRules,
      }),
    [user, activeCompanyId, orgRules, departmentRules, employeeRules, personalRules]
  );

  const { hiddenIds, grantedIds, grantedHrefs, blockedHrefs, visibleMenu } = resolved;

  const isHrefBlocked = useCallback(
    (href?: string | null) => Boolean(href && blockedHrefs.has(href)),
    [blockedHrefs]
  );
  const isPartHidden = useCallback((partId: string) => hiddenIds.has(partId), [hiddenIds]);

  const isAdmin = authService.isAdmin(user);
  const isVisibilityController = isVisibilityControllerUser(user) || isAdmin;

  return {
    hiddenIds,
    grantedIds,
    grantedHrefs,
    blockedHrefs,
    visibleMenu: visibleMenu as NavItem[],
    companyScope,
    isAdmin,
    isVisibilityController,
    isHrefBlocked,
    isPartHidden,
  };
}

export default useModuleVisibility;
