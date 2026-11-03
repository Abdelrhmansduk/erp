import React, { useEffect, useState, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Building2,
  MapPin,
  Layers,
  Sparkles,
  ArrowLeft,
  Lock,
} from 'lucide-react';
import {
  authService,
  CORPORATE_DEPARTMENTS,
  COMPANY_AUTH_METADATA,
  DepartmentId,
  resolveDepartmentAndCompany,
} from '../../services/authService';
import { EmployeePhotoAvatar } from './EmployeePhotoAvatar';

export interface ExecutiveWelcomeScreenProps {
  onComplete: () => void;
  durationMs?: number;
}

export const ExecutiveWelcomeScreen: React.FC<ExecutiveWelcomeScreenProps> = ({
  onComplete,
  durationMs = 3000,
}) => {
  const [progress, setProgress] = useState<number>(6);
  const [activeStep, setActiveStep] = useState<number>(1);

  const currentUser = authService.getCurrentUser();
  const resolvedScope = useMemo(
    () =>
      resolveDepartmentAndCompany(
        currentUser?.email || currentUser?.username || 'chairman@alsulaim.sa',
        currentUser?.role,
        currentUser?.company_id,
        currentUser?.department_id
      ),
    [currentUser]
  );

  const deptMeta =
    CORPORATE_DEPARTMENTS[resolvedScope.departmentId as DepartmentId] ||
    CORPORATE_DEPARTMENTS.executive;
  const compKey =
    resolvedScope.companyId === 'all' ? 'ALL' : resolvedScope.companyId.toUpperCase();
  const compMeta = COMPANY_AUTH_METADATA[compKey] || COMPANY_AUTH_METADATA.ALL;

  const displayName = currentUser?.full_name || 'الشيخ خالد بن عبدالعزيز السليم';
  const displayRole = currentUser?.role || deptMeta.nameAr;
  const displayBranch = currentUser?.branch || 'المقر الرئيسي للمجموعة - الرياض';
  const displayEmail = currentUser?.email || 'chairman@alsulaim.sa';
  const avatarUrl = (currentUser as any)?.avatar_url;

  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'صباح الخير والريادة المؤسسية' : 'مساء الخير والريادة المؤسسية';
  }, []);

  const authorizedModulesCount = useMemo(() => {
    if (deptMeta.allowedTabs.includes('*')) return 35;
    return Math.max(8, deptMeta.allowedTabs.length);
  }, [deptMeta]);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setProgress(pct);

      if (elapsed >= durationMs * 0.62) {
        setActiveStep(3);
      } else if (elapsed >= durationMs * 0.28) {
        setActiveStep(2);
      }
    }, 40);

    const timer = setTimeout(() => {
      onComplete();
    }, durationMs);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [durationMs, onComplete]);

  const remainingSeconds = Math.max(1, Math.ceil(((100 - progress) / 100) * (durationMs / 1000)));

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[3000] min-h-screen w-full bg-[#faf9f7] text-[#141414] flex flex-col items-center justify-between p-4 sm:p-8 overflow-hidden select-none"
    >
      {/* Subtle Architectural Grid & Radial Ambient Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 28%, rgba(0, 102, 255, 0.08) 0%, rgba(20, 20, 20, 0.03) 42%, transparent 72%), linear-gradient(to right, rgba(20,20,20,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(20,20,20,0.035) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 48px 48px, 48px 48px',
        }}
      />

      {/* Top Institutional Bar */}
      <header className="relative z-10 w-full max-w-4xl flex items-center justify-between gap-3 pt-1">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ffffff] border border-[#e0e0e0] shadow-xs text-xs font-bold text-[#141414]">
          <Sparkles className="w-3.5 h-3.5 text-[#0066ff]" />
          <span>مجموعة خالد السليم القابضة • بوابة النفاذ الموحد</span>
        </div>

        <button
          type="button"
          onClick={onComplete}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#ffffff] hover:bg-[#f3f3f3] border border-[#e0e0e0] text-xs font-bold text-[#141414] transition-all cursor-pointer shadow-xs"
        >
          <span>تخطي والانتقال فوراً ({remainingSeconds}ث)</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Main Executive Welcome Card */}
      <main className="relative z-10 w-full max-w-2xl my-auto">
        <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[32px] p-6 sm:p-10 shadow-[0_24px_64px_-16px_rgba(20,20,20,0.10)] text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
          {/* Employee Portrait Photo with Animated Institutional Halo */}
          <div className="relative mx-auto w-fit flex items-center justify-center">
            <div
              aria-hidden="true"
              className="absolute -inset-3 rounded-full border border-[#0066ff]/25 animate-pulse"
            />
            <div
              aria-hidden="true"
              className="absolute -inset-1.5 rounded-full border-2 border-[#141414]/10"
            />
            <EmployeePhotoAvatar
              name={displayName}
              email={displayEmail}
              role={displayRole}
              departmentId={resolvedScope.departmentId}
              avatarUrl={avatarUrl}
              size="hero"
              showVerifiedBadge
              showOnlinePulse
            />
          </div>

          {/* Personalized Greeting & Employee Name */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[11px] font-bold text-[#141414]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0066ff]" />
              <span>{greetingText} • تم توثيق الجلسة بنجاح</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-[#141414] tracking-tight m-0 pt-1">
              مرحباً بك، {displayName}
            </h1>

            <p className="text-sm sm:text-base font-bold text-[#707070] m-0">
              {displayRole}
            </p>
          </div>

          {/* Employee Metadata Pills (Company, Department, Branch) */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold">
              <Building2 className="w-3.5 h-3.5" />
              <span>{compMeta.nameAr}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#141414] text-xs font-bold">
              <Layers className="w-3.5 h-3.5 text-[#0066ff]" />
              <span>{deptMeta.nameAr}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#f3f3f3] border border-[#e0e0e0] text-[#707070] text-xs font-semibold">
              <MapPin className="w-3.5 h-3.5 text-[#141414]" />
              <span>{displayBranch}</span>
            </span>
          </div>

          {/* 3-Step Live Security & Permission Cards Preparation Tracker */}
          <div className="bg-[#f8f8f7] border border-[#eceae4] rounded-2xl p-4 text-right space-y-2.5">
            {[
              {
                step: 1,
                label: 'التحقق من الهوية الرقمية وتوثيق صلاحيات الموظف (IAM Verified)',
              },
              {
                step: 2,
                label: `تفعيل نطاق العزل المؤسسي لقسم (${deptMeta.badgeText})`,
              },
              {
                step: 3,
                label: `تجهيز صفحة البطاقات الخاصة بصلاحياتك (${authorizedModulesCount} بطاقة نظامية مصرحة)`,
              },
            ].map((item) => {
              const isDone = activeStep >= item.step;
              return (
                <div
                  key={item.step}
                  className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isDone
                      ? 'bg-[#ffffff] text-[#141414] border border-[#e5e5e5] shadow-2xs'
                      : 'text-[#707070] opacity-65'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isDone ? 'text-[#0066ff]' : 'text-[#adadad]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#707070]">
                    {isDone ? 'مكتمل ✓' : '...'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 3-Second Animated Progress Bar */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#707070]">
              <span className="inline-flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-[#141414]" />
                <span>جاري نقلك تلقائياً إلى صفحة البطاقات الخاصة بصلاحياتك...</span>
              </span>
              <span className="font-mono text-[#141414]">{progress}%</span>
            </div>

            <div className="w-full h-2 rounded-full bg-[#eceae4] overflow-hidden">
              <div
                className="h-full bg-[#141414] rounded-full transition-all duration-75 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Institutional Assurance Footer */}
      <footer className="relative z-10 w-full max-w-4xl flex items-center justify-center text-[11px] font-semibold text-[#707070]">
        <span>جميع الجلسات محمية ومشفرة وفق معايير الحوكمة والأمن السيبراني لمجموعة خالد السليم © 2026</span>
      </footer>
    </div>
  );
};

export default ExecutiveWelcomeScreen;
