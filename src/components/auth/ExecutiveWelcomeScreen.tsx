import React, { useEffect, useState, useMemo } from 'react';
import {
  authService,
  CORPORATE_DEPARTMENTS,
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
  durationMs = 2400,
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [isExiting, setIsExiting] = useState<boolean>(false);

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

  const displayName = currentUser?.full_name || 'الشيخ خالد بن عبدالعزيز السليم';
  const displayRole = currentUser?.role || deptMeta.nameAr;
  const displayEmail = currentUser?.email || 'chairman@alsulaim.sa';
  const avatarUrl = (currentUser as any)?.avatar_url;

  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'صباح الخير، مرحباً بعودتك' : 'مساء الخير، مرحباً بعودتك';
  }, []);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setProgress(pct);
    }, 25);

    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, Math.max(0, durationMs - 280));

    const timer = setTimeout(() => {
      onComplete();
    }, durationMs);

    return () => {
      clearInterval(interval);
      clearTimeout(exitTimer);
      clearTimeout(timer);
    };
  }, [durationMs, onComplete]);

  // SVG Circular ring geometry around the hero avatar
  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <main
      dir="rtl"
      onClick={onComplete}
      aria-live="polite"
      aria-label="شاشة الترحيب التنفيذية"
      title="اضغط للمتابعة الفورية"
      className="fixed inset-0 z-[3000] min-h-screen w-full bg-[#ffffff] text-[#141414] flex flex-col items-center justify-center p-6 overflow-hidden select-none cursor-pointer"
    >
      <style>{`
        @keyframes welcomeAvatarPop {
          0% {
            transform: scale(0.92) translateY(8px);
          }
          65% {
            transform: scale(1.02) translateY(0);
          }
          100% {
            transform: scale(1) translateY(0);
          }
        }
        @keyframes welcomeTextReveal {
          0% {
            transform: translateY(8px);
          }
          100% {
            transform: translateY(0);
          }
        }
        @keyframes welcomeHaloBreathe {
          0%, 100% {
            transform: scale(1);
            opacity: 0.14;
          }
          50% {
            transform: scale(1.12);
            opacity: 0.04;
          }
        }
        .welcome-avatar-enter {
          animation: welcomeAvatarPop 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .welcome-halo-ring {
          animation: welcomeHaloBreathe 2.2s ease-in-out infinite;
        }
        .welcome-reveal-1 {
          animation: welcomeTextReveal 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .welcome-reveal-2 {
          animation: welcomeTextReveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .welcome-reveal-3 {
          animation: welcomeTextReveal 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Center Minimalist Professional Welcome Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full space-y-6">
        {/* Animated Portrait Photo with Circular Progress Ring & Breathing Halo */}
        <div className="relative flex items-center justify-center welcome-avatar-enter">
          <div
            aria-hidden="true"
            className="welcome-halo-ring absolute w-44 h-44 rounded-full bg-[#141414]"
          />

          <svg
            className="w-40 h-40 -rotate-90"
            viewBox="0 0 160 160"
            aria-hidden="true"
          >
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="#f0f0f0"
              strokeWidth="2.5"
            />
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="#141414"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 60ms linear' }}
            />
          </svg>

          <div className="absolute inset-0 flex items-center justify-center">
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
        </div>

        {/* Staggered Name & Role Typography */}
        <div className="space-y-1.5">
          <p className="welcome-reveal-1 text-xs sm:text-sm font-semibold text-[#141414] m-0">
            {greetingText}
          </p>

          <h1 className="welcome-reveal-2 text-2xl sm:text-3xl font-bold text-[#141414] tracking-tight m-0">
            {displayName}
          </h1>

          <p className="welcome-reveal-3 text-xs sm:text-sm font-medium text-[#141414] m-0 pt-0.5">
            {displayRole}
          </p>
        </div>

        {/* Minimalist Smooth Progress Line */}
        <div className="welcome-reveal-3 w-32 h-1 rounded-full bg-[#f0f0f0] overflow-hidden">
          <div
            className="h-full bg-[#141414] rounded-full transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </main>
  );
};

export default ExecutiveWelcomeScreen;
