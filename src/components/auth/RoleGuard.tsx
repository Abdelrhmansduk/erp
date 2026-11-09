import React from 'react';
import { useAuthContext } from '../../contexts/AuthContext';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'finance' | 'hr' | 'operations' | 'customerService')[];
  fallback?: React.ReactNode;
}

/**
 * Conditionally renders children based on user's role.
 * Use this to hide/show UI elements based on permissions.
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles = [],
  fallback = null
}) => {
  const { user, isAdmin, isFinance, isHR, isOperations, isCustomerService } = useAuthContext();

  if (!user) return <>{fallback}</>;

  const roleMap = {
    admin: isAdmin,
    finance: isFinance,
    hr: isHR,
    operations: isOperations,
    customerService: isCustomerService
  };

  const hasPermission = allowedRoles.length === 0 || allowedRoles.some(role => roleMap[role]);

  return <>{hasPermission ? children : fallback}</>;
};

export default RoleGuard;
