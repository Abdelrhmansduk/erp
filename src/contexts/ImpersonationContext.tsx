import React, { createContext, useContext, useState } from 'react';
import { AuditLogItem, CompanyId } from '../types';

interface ImpersonatedState {
  isImpersonating: boolean;
  employeeId?: string;
  employeeName?: string;
  employeeTitle?: string;
  targetCompanyId?: CompanyId;
  targetBranch?: string;
  reason?: string;
  startTime?: string;
}

interface ImpersonationContextType {
  impersonatedState: ImpersonatedState;
  auditLogs: AuditLogItem[];
  startImpersonation: (employeeId: string, employeeName: string, employeeTitle: string, targetCompanyId: CompanyId, targetBranch: string, reason: string) => void;
  stopImpersonation: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export const ImpersonationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [impersonatedState, setImpersonatedState] = useState<ImpersonatedState>({
    isImpersonating: false,
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const startImpersonation = (
    employeeId: string,
    employeeName: string,
    employeeTitle: string,
    targetCompanyId: CompanyId,
    targetBranch: string,
    reason: string
  ) => {
    const startTime = new Date().toLocaleTimeString('ar-SA');
    setImpersonatedState({
      isImpersonating: true,
      employeeId,
      employeeName,
      employeeTitle,
      targetCompanyId,
      targetBranch,
      reason,
      startTime,
    });

    const newLog: AuditLogItem = {
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      actorId: 'ADM-001',
      actorName: 'سليمان خالد السليم (Super Admin)',
      actionType: 'محاكاة موظف',
      companyId: targetCompanyId,
      branchName: targetBranch,
      ipAddress: '192.168.1.104',
      details: `بدء محاكاة الموظف (${employeeName} - ${employeeTitle}) لسبب: ${reason}`,
      impersonatedEmployeeId: employeeId,
    };

    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const stopImpersonation = () => {
    if (impersonatedState.isImpersonating) {
      const stopLog: AuditLogItem = {
        id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toISOString(),
        actorId: 'ADM-001',
        actorName: 'سليمان خالد السليم (Super Admin)',
        actionType: 'محاكاة موظف',
        companyId: impersonatedState.targetCompanyId || 'all',
        branchName: impersonatedState.targetBranch || 'الفرع الرئيسي',
        ipAddress: '192.168.1.104',
        details: `إنهاء محاكاة الموظف (${impersonatedState.employeeName}) والعودة لصلاحيات الأدمن كاملة.`,
        impersonatedEmployeeId: impersonatedState.employeeId,
      };
      setAuditLogs((prev) => [stopLog, ...prev]);
    }
    setImpersonatedState({ isImpersonating: false });
  };

  return (
    <ImpersonationContext.Provider
      value={{
        impersonatedState,
        auditLogs,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
};

export const useImpersonation = (): ImpersonationContextType => {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
};
