import React from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { Loader2, ShieldAlert, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requireAuth = true,
}) => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: '12px',
        }}
      >
        <Loader2 className="w-10 h-10 animate-spin text-[#141414]" />
        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>جاري التحقق من الجلسة...</span>
      </div>
    );
  }

  // SECURITY: Block access if authentication is required but no user is logged in
  if (requireAuth && !user) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: '16px',
          padding: '40px',
          textAlign: 'center',
          direction: 'rtl',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: '#f3f3f3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Lock style={{ width: '36px', height: '36px', color: '#141414' }} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
          غير مصرح بالوصول
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '400px', lineHeight: '1.6' }}>
          يجب تسجيل الدخول للوصول إلى هذه الصفحة. يرجى العودة لصفحة تسجيل الدخول والمصادقة بحسابك المعتمد.
        </p>
      </div>
    );
  }

  // SECURITY: Block access if user doesn't have the required role
  if (allowedRoles && allowedRoles.length > 0 && user) {
    const hasRole = allowedRoles.includes(user.role);
    if (!hasRole) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            gap: '16px',
            padding: '40px',
            textAlign: 'center',
            direction: 'rtl',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#f3f3f3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldAlert style={{ width: '36px', height: '36px', color: '#141414' }} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
            صلاحيات غير كافية
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '400px', lineHeight: '1.6' }}>
            حسابك لا يملك الصلاحيات المطلوبة للوصول إلى هذا القسم. يرجى التواصل مع مسؤول النظام.
          </p>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            الدور الحالي: {user.role}
          </span>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
