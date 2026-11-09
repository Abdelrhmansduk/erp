import React from 'react';
import { AlertCircle, Inbox, Loader2, RefreshCw } from 'lucide-react';

/**
 * Unified UI Pattern & State Primitives (/ui-pattern + /angular-ui-patterns + /frontend-architecture)
 * Strictly adheres to Mobbin Gallery-White Monochrome (#ffffff, #f3f3f3, #141414, #707070, #e0e0e0)
 * and the Golden Rule of UI States: Error -> Loading (only when empty) -> Empty -> Content.
 */

export interface ICardSectionProps {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const CardSection: React.FC<ICardSectionProps> = ({
  title,
  subtitle,
  badge,
  actions,
  children,
  className = '',
}) => (
  <section
    data-slot="card-section"
    className={`bg-[#ffffff] border border-[#e0e0e0] rounded-[24px] p-6 space-y-4 ${className}`.trim()}
  >
    <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[#f0f0f0]">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-[#141414] leading-snug tracking-[-0.01em] m-0">
            {title}
          </h3>
          {badge && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0]">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-[#707070] mt-1 m-0 leading-normal">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
    <div>{children}</div>
  </section>
);

export interface IDetailCardItem {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

export interface IDetailCardProps {
  title?: string;
  items: IDetailCardItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export const DetailCard: React.FC<IDetailCardProps> = ({
  title,
  items,
  columns = 2,
  className = '',
}) => {
  const gridCols =
    columns === 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : columns === 3
        ? 'grid-cols-1 sm:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2';

  return (
    <div
      data-slot="detail-card"
      className={`bg-[#f3f3f3] border border-[#e0e0e0] rounded-[16px] p-4 space-y-3 ${className}`.trim()}
    >
      {title && (
        <h4 className="text-xs font-bold text-[#141414] m-0 pb-2 border-b border-[#e0e0e0]">
          {title}
        </h4>
      )}
      <dl className={`grid ${gridCols} gap-3 m-0`}>
        {items.map((item, idx) => (
          <div key={idx} className="bg-[#ffffff] border border-[#e0e0e0] rounded-[12px] p-3">
            <dt className="text-[11px] font-semibold text-[#707070]">{item.label}</dt>
            <dd
              className={`text-sm font-bold text-[#141414] mt-1 m-0 ${
                item.mono ? 'font-mono tabular-nums' : ''
              }`.trim()}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

export interface IFilterBarOption {
  id: string;
  label: string;
  count?: number;
}

export interface IFilterBarProps {
  options: IFilterBarOption[];
  activeId: string;
  onSelect: (id: string) => void;
  ariaLabel?: string;
  className?: string;
}

export const FilterBar: React.FC<IFilterBarProps> = ({
  options,
  activeId,
  onSelect,
  ariaLabel = 'تصفية العرض',
  className = '',
}) => (
  <div
    data-slot="filter-bar"
    role="tablist"
    aria-label={ariaLabel}
    className={`flex items-center gap-2 overflow-x-auto pb-1 thin-scrollbar ${className}`.trim()}
  >
    {options.map((opt) => {
      const isActive = opt.id === activeId;
      return (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={isActive}
          onClick={() => onSelect(opt.id)}
          className={`min-h-[40px] px-4 py-1.5 rounded-full text-xs font-bold transition-colors duration-150 flex items-center gap-1.5 shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#141414] ${
            isActive
              ? 'bg-[#141414] text-[#ffffff] border border-[#141414]'
              : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] hover:bg-[#eaeaea]'
          }`}
        >
          <span>{opt.label}</span>
          {typeof opt.count === 'number' && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono tabular-nums ${
                isActive ? 'bg-[#262626] text-[#ffffff]' : 'bg-[#ffffff] text-[#707070]'
              }`}
            >
              {opt.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export interface IAsyncStateBoundaryProps {
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onRetry?: () => void;
  skeletonRows?: number;
  children: React.ReactNode;
}

/**
 * Implements the Golden Rule from /angular-ui-patterns:
 * 1. Error -> Show ErrorState with retry
 * 2. Loading AND no data -> Show Skeleton placeholders (never flash spinner over existing data)
 * 3. Empty -> Show contextual EmptyState
 * 4. Data present -> Render children
 */
export const AsyncStateBoundary: React.FC<IAsyncStateBoundaryProps> = ({
  loading = false,
  error = null,
  isEmpty = false,
  emptyTitle = 'لا توجد سجلات متاحة حالياً',
  emptyDescription = 'يمكنك إضافة سجل جديد أو تعديل معايير البحث والتصفية.',
  emptyActionLabel,
  onEmptyAction,
  onRetry,
  skeletonRows = 3,
  children,
}) => {
  if (error) {
    return (
      <div
        data-slot="error-state"
        role="alert"
        className="bg-[#f3f3f3] border border-[#141414] rounded-[20px] p-6 text-center space-y-3"
      >
        <div className="size-11 rounded-full bg-[#141414] text-[#ffffff] flex items-center justify-center mx-auto">
          <AlertCircle className="size-5" />
        </div>
        <h4 className="text-sm font-bold text-[#141414] m-0">تعذر تحميل البيانات</h4>
        <p className="text-xs text-[#707070] max-w-md mx-auto m-0">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-[40px] px-4 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#262626] transition-colors"
          >
            <RefreshCw className="size-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        )}
      </div>
    );
  }

  if (loading && isEmpty) {
    return (
      <div
        data-slot="loading-skeleton"
        aria-busy="true"
        aria-live="polite"
        className="space-y-3 py-2"
      >
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-[16px] border border-[#e0e0e0] motion-shimmer"
          />
        ))}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div
        data-slot="empty-state"
        className="bg-[#f3f3f3] border border-[#e0e0e0] rounded-[20px] p-8 text-center space-y-3"
      >
        <div className="size-11 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[#141414] flex items-center justify-center mx-auto">
          <Inbox className="size-5" />
        </div>
        <h4 className="text-sm font-bold text-[#141414] m-0">{emptyTitle}</h4>
        <p className="text-xs text-[#707070] max-w-md mx-auto m-0">{emptyDescription}</p>
        {emptyActionLabel && onEmptyAction && (
          <button
            type="button"
            onClick={onEmptyAction}
            className="min-h-[40px] px-5 py-2 rounded-full bg-[#141414] text-[#ffffff] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#262626] transition-colors"
          >
            <span>{emptyActionLabel}</span>
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
};

export interface IAsyncActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingLabel?: string;
  variant?: 'primary' | 'secondary';
}

export const AsyncActionButton: React.FC<IAsyncActionButtonProps> = ({
  loading = false,
  loadingLabel = 'جارٍ التنفيذ...',
  variant = 'primary',
  disabled,
  children,
  className = '',
  ...rest
}) => {
  const baseClass =
    variant === 'primary'
      ? 'bg-[#141414] text-[#ffffff] border border-[#141414] hover:bg-[#262626]'
      : 'bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] hover:bg-[#eaeaea]';

  return (
    <button
      type="button"
      data-slot="async-action-button"
      disabled={loading || disabled}
      className={`min-h-[40px] px-4 py-2 rounded-full text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed motion-spring-press ${baseClass} ${className}`.trim()}
      {...rest}
    >
      {loading && <Loader2 className="size-3.5 animate-spin" />}
      <span>{loading ? loadingLabel : children}</span>
    </button>
  );
};
