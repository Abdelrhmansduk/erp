import React from 'react';
import { useIamSession } from '../../contexts/IamSessionContext';
import { ShieldAlert, Lock, ArrowLeft, RefreshCw } from 'lucide-react';

interface PermissionGuardProps {
  permission?: string;
  module?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const Unauthorized403View: React.FC<{ message?: string }> = ({ 
  message = 'عفواً، ليس لديك الصلاحيات الكافية للوصول إلى هذه الوحدة أو هذا المورد.' 
}) => {
  const { activeCompany, currentUser } = useIamSession();

  return (
    <div className="min-h-[450px] flex items-center justify-center p-6" dir="rtl">
      <div className="max-w-md w-full bg-white border border-[#e0e0e0] rounded-2xl p-8 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 bg-[#f3f3f3] text-[#141414] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 bg-[#f3f3f3] text-[#141414] text-xs font-bold rounded-full border border-[#e0e0e0]">
            خطأ 403 — وصول غير مصرح (Forbidden)
          </span>
          <h2 className="text-xl font-bold text-slate-900">
            رفض الوصول وفق سياسة العزل الأمني
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-right space-y-1.5 text-xs text-slate-600">
          <div className="flex justify-between">
            <span className="font-semibold text-slate-700">المستخدم:</span>
            <span>{currentUser?.fullName} ({currentUser?.employeeNumber})</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-700">نطاق الشركة:</span>
            <span className="font-bold text-[#141414]">{activeCompany?.commercialName}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-700">مستوى الحساب:</span>
            <span>{currentUser?.accountType}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => window.history.back()}
            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            الرجوع للخلف
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 px-4 py-2.5 bg-[#141414] hover:bg-[#262626] text-white text-sm font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث الجلسة
          </button>
        </div>
      </div>
    </div>
  );
};

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  fallback,
  children,
}) => {
  const { hasPermission } = useIamSession();

  if (permission && !hasPermission(permission)) {
    return fallback ? <>{fallback}</> : <Unauthorized403View />;
  }

  return <>{children}</>;
};
