/**
 * SAMA Official Saudi Riyal Symbol (SRS) & Multi-Currency Formatting Utilities
 * Regulatory Reference: https://sama.gov.sa/ar-sa/Currency/SRS/Documents/Guidelines.pdf
 *
 * Rules:
 * 1. Always use official Unicode codepoint U+20C1 (⃁) rendered via `saudi_riyal` font.
 * 2. Always place the symbol to the LEFT of the numeral in both Arabic (RTL) and English (LTR).
 * 3. Always maintain a clear space between the symbol and the number.
 * 4. For negative values, place the symbol to the left of the minus sign: `⃁ -1,250.00`.
 */

export const SAUDI_RIYAL_UNICODE = '\u20C1';
export const USD_TO_SAR_PEG = 3.75;

export interface FormatSarOptions {
  /** Number of decimal places (defaults to 2 for accounting ledgers, 0 for KPI summaries) */
  decimals?: number;
  /** Locale for digit grouping (defaults to 'en-US' for standard tabular numerals) */
  locale?: string;
}

/**
 * Formats a numeric value in Saudi Riyals with the official SAMA symbol (`⃁`) on the left.
 * Example:
 * - `formatSarCurrency(1250.5)` -> `"⃁ 1,250.50"`
 * - `formatSarCurrency(-1250.5)` -> `"⃁ -1,250.50"`
 */
export function formatSarCurrency(
  amount: number | string | null | undefined,
  options: FormatSarOptions = {}
): string {
  const numericValue = Number(amount);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
  const decimals = options.decimals ?? 2;
  const locale = options.locale ?? 'en-US';

  const isNegative = safeValue < 0;
  const absFormatted = Math.abs(safeValue).toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return isNegative
    ? `${SAUDI_RIYAL_UNICODE} -${absFormatted}`
    : `${SAUDI_RIYAL_UNICODE} ${absFormatted}`;
}

/**
 * Converts a USD amount to SAR using the official SAMA fixed peg (1 USD = 3.75 SAR)
 * and returns both the raw SAR value and the formatted bilingual string.
 */
export function formatUsdToSarPeg(usdAmount: number, decimals = 2): {
  usd: number;
  sar: number;
  exchangeRate: number;
  formattedUsd: string;
  formattedSar: string;
} {
  const safeUsd = Number.isFinite(usdAmount) ? usdAmount : 0;
  const sar = Math.round(safeUsd * USD_TO_SAR_PEG * 100) / 100;

  return {
    usd: safeUsd,
    sar,
    exchangeRate: USD_TO_SAR_PEG,
    formattedUsd: `$ ${safeUsd.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`,
    formattedSar: formatSarCurrency(sar, { decimals }),
  };
}
