import { CompanyId } from '../types';
import { normalizeCompanyId } from '../contexts/CompanyContext';

/**
 * Company Data Scope & Isolation Guard
 * Enforces company-level filtering and security checks on all queries and mutations.
 * Prevents cross-company data leakage (Spec §3 & §61).
 */

export interface CompanyScopedParams {
  companyId: CompanyId;
  branchId?: string;
  departmentId?: string;
  costCenterId?: string;
}

/**
 * Ensures that any record created or queried carries a valid companyId scope.
 */
export const enforceCompanyScope = <T extends Record<string, any>>(
  data: T,
  activeCompanyId: CompanyId
): T & { company_id: string } => {
  const normalized = normalizeCompanyId(activeCompanyId);
  if (!normalized || normalized === 'all') {
    throw new Error('[Security Exception] Cannot create company-level record without specifying a explicit CompanyId.');
  }

  return {
    ...data,
    company_id: normalized,
  };
};

/**
 * Validates if the user is authorized to view or mutate data belonging to targetCompanyId.
 */
export const validateCrossCompanyAccess = (
  userAllowedCompanies: CompanyId[],
  targetCompanyId: CompanyId
): boolean => {
  if (userAllowedCompanies.includes('all')) return true;
  const targetNorm = normalizeCompanyId(targetCompanyId);
  return userAllowedCompanies.some((id) => normalizeCompanyId(id) === targetNorm);
};
