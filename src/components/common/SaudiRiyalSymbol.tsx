import React from 'react';
import {
  SAUDI_RIYAL_SVG_PATH,
  SAUDI_RIYAL_SVG_VIEWBOX,
  FormatSaudiRiyalOptions,
  formatSaudiRiyal,
} from '../../utils/saudiRiyal';

export interface SaudiRiyalSymbolProps {
  /** Size in CSS units or pixels (defaults to "0.92em" to match numeral cap-height per SAMA Guidelines) */
  size?: number | string;
  /** Optional additional CSS classes */
  className?: string;
  /** Accessible title for screen readers */
  title?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;
}

/**
 * Official SAMA Saudi Riyal Symbol Vector Component (`Guidelines.pdf`)
 * - Maintains strict 1:1 official geometric proportions (`viewBox="0 0 1256 1256"`).
 * - Inherits surrounding text color (`fill="currentColor"`) for monochrome contrast compliance.
 * - Aligns cleanly with the numeral baseline (`verticalAlign: '-0.08em'`).
 */
export const SaudiRiyalSymbol: React.FC<SaudiRiyalSymbolProps> = ({
  size = '0.92em',
  className = '',
  title = 'ريال سعودي',
  style,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={SAUDI_RIYAL_SVG_VIEWBOX}
      width={size}
      height={size}
      fill="currentColor"
      role="img"
      aria-label={title}
      className={`inline-block shrink-0 select-none ${className}`.trim()}
      style={{
        verticalAlign: '-0.08em',
        lineHeight: 1,
        aspectRatio: '1 / 1',
        ...style,
      }}
    >
      <path d={SAUDI_RIYAL_SVG_PATH} />
    </svg>
  );
};

export interface SaudiRiyalAmountProps extends FormatSaudiRiyalOptions {
  amount: number | string | null | undefined;
  className?: string;
  symbolClassName?: string;
  useSvg?: boolean;
}

/**
 * SAMA-Compliant Currency Amount Display Component
 * Always places the Saudi Riyal Symbol to the LEFT of the numerical value with a clear space,
 * and positions the negative sign between the symbol and the digits (`⃁ -1,250.00`).
 */
export const SaudiRiyalAmount: React.FC<SaudiRiyalAmountProps> = ({
  amount,
  className = '',
  symbolClassName = '',
  useSvg = true,
  ...formatOptions
}) => {
  if (!useSvg) {
    return (
      <span className={`tabular-nums ${className}`.trim()}>
        {formatSaudiRiyal(amount, formatOptions)}
      </span>
    );
  }

  const numeric =
    typeof amount === 'number'
      ? amount
      : typeof amount === 'string'
        ? parseFloat(amount.replace(/[^\d.-]/g, ''))
        : 0;
  const safeAmount = Number.isFinite(numeric) ? numeric : 0;
  const isNegative = safeAmount < 0;
  const absAmount = Math.abs(safeAmount);

  const locale = formatOptions.locale ?? 'en-US';
  const minFrac =
    formatOptions.decimals !== undefined
      ? formatOptions.decimals
      : formatOptions.minimumFractionDigits !== undefined
        ? formatOptions.minimumFractionDigits
        : 2;
  const maxFrac =
    formatOptions.decimals !== undefined
      ? formatOptions.decimals
      : formatOptions.maximumFractionDigits !== undefined
        ? formatOptions.maximumFractionDigits
        : Math.max(minFrac, 2);

  const formattedDigits = absAmount.toLocaleString(locale, {
    minimumFractionDigits: minFrac,
    maximumFractionDigits: maxFrac,
  });

  const signPrefix = isNegative ? '-' : formatOptions.showPlusSign && safeAmount > 0 ? '+' : '';

  return (
    <span
      dir="ltr"
      className={`inline-flex items-baseline gap-[0.22em] tabular-nums whitespace-nowrap ${className}`.trim()}
    >
      <SaudiRiyalSymbol className={symbolClassName} />
      <span>
        {signPrefix}
        {formattedDigits}
      </span>
    </span>
  );
};
