import { describe, it, expect } from 'vitest';
import { iamPolicyEngine } from './iamPolicyEngine';
import { IamUser, DataScopeLevel, RecordAccessContext } from '../types/iam';

describe('IAM Policy & Multi-Entity Access Control Engine', () => {
  const activeUser: IamUser = {
    id: 'usr-hr-001',
    employeeNumber: 'EMP-1002',
    fullName: 'سارة بنت أحمد المحمد',
    email: 'sara.hr@saf-rec.sa',
    phone: '0551122334',
    jobTitle: 'أخصائية موارد بشرية واستقدام',
    accountType: 'Employee',
    status: 'نشط',
    dataScope: 3 as DataScopeLevel, // Department Scope
    branchId: 'BR-RUH',
    departmentId: 'DEPT-HR',
    mfaEnabled: true,
    mfaMethod: 'Google Authenticator',
    biometricEnabled: true,
    sessionTimeoutMinutes: 30,
  };

  const hrSecurityContext = {
    user: activeUser,
    activeTenantId: '11111111-1111-1111-1111-111111111111',
    activeCompanyId: 'SAF',
    allowedCompanyIds: ['SAF'],
    allowedBranchIds: ['BR-RUH'],
    allowedDepartmentIds: ['DEPT-HR'],
    dataScope: 3 as DataScopeLevel,
    permissionCodes: new Set(['hr.view', 'hr.create', 'hr.edit', 'recruitment.view']),
  };

  describe('1. Deny by Default Policy (Section 1 & 20)', () => {
    it('should deny unauthenticated requests', () => {
      const decision = iamPolicyEngine.evaluateAccessDecision(
        { ...hrSecurityContext, user: null },
        'hr',
        'view'
      );
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('Deny');
    });

    it('should deny inactive/suspended accounts', () => {
      const suspendedUser: IamUser = { ...activeUser, status: 'موقوف' };
      const decision = iamPolicyEngine.evaluateAccessDecision(
        { ...hrSecurityContext, user: suspendedUser },
        'hr',
        'view'
      );
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('موقوف');
    });

    it('should deny when permission code is not explicitly granted', () => {
      // Trying to delete HR employee without 'hr.delete'
      const decision = iamPolicyEngine.evaluateAccessDecision(
        hrSecurityContext,
        'hr',
        'delete'
      );
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('Missing required permission code');
    });

    it('should deny access to unauthorized modules (e.g. accounting/finance)', () => {
      const decision = iamPolicyEngine.evaluateAccessDecision(
        hrSecurityContext,
        'finance',
        'view'
      );
      expect(decision.allowed).toBe(false);
    });
  });

  describe('2. Multi-Company Isolation (Section 2, 8, 11)', () => {
    it('should deny access to records belonging to another company', () => {
      const crossCompanyRecord: RecordAccessContext = {
        id: 'rec-999',
        company_id: 'YAQ', // Belongs to YAQ RC02, while user is in SAF RC01
        department_id: 'DEPT-HR',
        created_by: 'usr-other',
      };

      const decision = iamPolicyEngine.evaluateAccessDecision(
        hrSecurityContext,
        'hr',
        'view',
        crossCompanyRecord
      );
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('Record belongs to a different company');
    });

    it('should allow access to records within the active authorized company', () => {
      const validCompanyRecord: RecordAccessContext = {
        id: 'rec-101',
        company_id: 'SAF',
        department_id: 'DEPT-HR',
        created_by: 'usr-hr-001',
      };

      const decision = iamPolicyEngine.evaluateAccessDecision(
        hrSecurityContext,
        'hr',
        'view',
        validCompanyRecord
      );
      expect(decision.allowed).toBe(true);
    });
  });

  describe('3. Data Scope Levels & Filtering (Section 4, 9, 12)', () => {
    const dataset: RecordAccessContext[] = [
      { id: '1', company_id: 'SAF', branch_id: 'BR-RUH', department_id: 'DEPT-HR', created_by: 'usr-hr-001' },
      { id: '2', company_id: 'SAF', branch_id: 'BR-RUH', department_id: 'DEPT-HR', created_by: 'usr-hr-002' },
      { id: '3', company_id: 'SAF', branch_id: 'BR-RUH', department_id: 'DEPT-FINANCE', created_by: 'usr-fin-001' },
      { id: '4', company_id: 'SAF', branch_id: 'BR-JED', department_id: 'DEPT-HR', created_by: 'usr-hr-003' },
      { id: '5', company_id: 'YAQ', branch_id: 'BR-DMM', department_id: 'DEPT-HR', created_by: 'usr-yaq-001' },
    ];

    it('Data Scope 0 (No Access): should filter out all records', () => {
      const filtered = iamPolicyEngine.filterRecordsByScope(dataset, {
        user: activeUser,
        activeCompanyId: 'SAF',
        allowedBranchIds: ['BR-RUH'],
        allowedDepartmentIds: ['DEPT-HR'],
        dataScope: 0,
      });
      expect(filtered).toHaveLength(0);
    });

    it('Data Scope 1 (Own): should only return records created/assigned to user', () => {
      const filtered = iamPolicyEngine.filterRecordsByScope(dataset, {
        user: activeUser,
        activeCompanyId: 'SAF',
        allowedBranchIds: ['BR-RUH'],
        allowedDepartmentIds: ['DEPT-HR'],
        dataScope: 1,
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });

    it('Data Scope 3 (Department): should only return records within authorized department', () => {
      const filtered = iamPolicyEngine.filterRecordsByScope(dataset, {
        user: activeUser,
        activeCompanyId: 'SAF',
        allowedBranchIds: ['BR-RUH', 'BR-JED'],
        allowedDepartmentIds: ['DEPT-HR'],
        dataScope: 3,
      });
      // Records 1, 2, 4 (all SAF + DEPT-HR; excludes DEPT-FINANCE and YAQ)
      expect(filtered).toHaveLength(3);
      expect(filtered.map(r => r.id)).toEqual(['1', '2', '4']);
    });

    it('Data Scope 4 (Branch): should only return records within authorized branch', () => {
      const filtered = iamPolicyEngine.filterRecordsByScope(dataset, {
        user: activeUser,
        activeCompanyId: 'SAF',
        allowedBranchIds: ['BR-RUH'],
        allowedDepartmentIds: ['*'],
        dataScope: 4,
      });
      // Records 1, 2, 3 (all SAF + BR-RUH; excludes BR-JED and YAQ)
      expect(filtered).toHaveLength(3);
      expect(filtered.map(r => r.id)).toEqual(['1', '2', '3']);
    });

    it('Data Scope 5 (Company): should return all records of active company SAF', () => {
      const filtered = iamPolicyEngine.filterRecordsByScope(dataset, {
        user: activeUser,
        activeCompanyId: 'SAF',
        allowedBranchIds: ['*'],
        allowedDepartmentIds: ['*'],
        dataScope: 5,
      });
      // Records 1, 2, 3, 4 (all SAF; excludes YAQ)
      expect(filtered).toHaveLength(4);
      expect(filtered.every(r => r.company_id === 'SAF')).toBe(true);
    });

    it('Data Scope 6 (Group Super Admin): should return all records across all entities', () => {
      const superAdminUser: IamUser = {
        ...activeUser,
        accountType: 'Group Super Admin',
        dataScope: 6,
      };

      const filtered = iamPolicyEngine.filterRecordsByScope(dataset, {
        user: superAdminUser,
        activeCompanyId: 'SAF',
        allowedBranchIds: ['*'],
        allowedDepartmentIds: ['*'],
        dataScope: 6,
        isSuperAdmin: true,
      });
      expect(filtered).toHaveLength(5);
    });
  });

  describe('4. Separation of Duties (SoD) Verification (Section 19)', () => {
    it('should detect conflicting toxic permission combinations', async () => {
      const conflictingPermissions = ['vendor.create', 'payment.release', 'hr.view'];
      const check = await iamPolicyEngine.checkSoDConflicts(conflictingPermissions);
      expect(check).toBeDefined();
      expect(check.hasConflict).toBe(true);
      expect(check.conflicts.length).toBeGreaterThanOrEqual(1);
      expect(check.conflicts[0].permissionA).toBe('vendor.create');
      expect(check.conflicts[0].permissionB).toBe('payment.release');
    }, 10000);
  });
});
