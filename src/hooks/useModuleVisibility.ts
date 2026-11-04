import { useCallback, useEffect, useMemo } from 'react';
import { SIDEBAR_MENU } from '../data/sidebarMenu';
import type { NavItem } from '../types';
import { useAuthContext } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { authService } from '../services/authService';
import {
  useModuleVisibilityStore,
  resolveEffectiveHiddenIds,
  filterNavTree,
  computeBlockedHrefs,
  VISIBILITY_SCOPES,
  type VisibilityScope,
} from '../services/moduleVisibility';

let remoteLoadStarted = false;

function toScope(value?: string | null): VisibilityScope | null {
  const upper = String(value || '').toUpperCase() as VisibilityScope;
  return VISIBILITY_SCOPES.includes(upper) ? upper : null;
}

/**
 * Effective visibility for the signed-in employee (org rules + company rules + personal rules).
 */
export function useModuleVisibility() {
  const { user } = useAuthContext();
  const { activeCompanyId } = useCompany();
  const orgRules = useModuleVisibilityStore((s) => s.orgRules);
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

  const hiddenIds = useMemo(
    () => resolveEffectiveHiddenIds({ orgRules, personalRules }, companyScope, user?.id || null),
    [orgRules, personalRules, companyScope, user?.id]
  );

  const visibleMenu = useMemo<NavItem[]>(() => filterNavTree(SIDEBAR_MENU, hiddenIds), [hiddenIds]);
  const blockedHrefs = useMemo(() => computeBlockedHrefs(SIDEBAR_MENU, hiddenIds), [hiddenIds]);

  const isHrefBlocked = useCallback(
    (href?: string | null) => Boolean(href && blockedHrefs.has(href)),
    [blockedHrefs]
  );
  const isPartHidden = useCallback((partId: string) => hiddenIds.has(partId), [hiddenIds]);

  return {
    hiddenIds,
    visibleMenu,
    companyScope,
    isAdmin: authService.isAdmin(user),
    isHrefBlocked,
    isPartHidden,
  };
}

export default useModuleVisibility;
