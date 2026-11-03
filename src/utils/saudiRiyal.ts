/**
 * Official Saudi Central Bank (SAMA) Saudi Riyal Symbol (SRS) Engine
 * Reference Specification: https://sama.gov.sa/ar-sa/Currency/SRS/Documents/Guidelines.pdf
 *
 * Core SAMA SRS Rules Enforced:
 * 1. Positioning (موقع الرمز): Always placed to the LEFT of the numerical value in all languages (Arabic RTL & English LTR).
 * 2. Spacing (المسافة الفاصلة): A clear space must always separate the symbol from the numerical value (never attached directly).
 * 3. Negative Values (القيم السالبة): Symbol is placed to the left of both the minus sign and the numeral (e.g. `⃁ -1,250.00`).
 * 4. Geometric Proportions (التناسب الهندسي): Matches the cap-height/x-height of surrounding numerals without stretching or distortion.
 * 5. Color & Contrast (اللون والتباين): Inherits the adjacent numeral's single monochrome color (`currentColor`) with high contrast.
 */

/** Official Unicode 17 code point for the Saudi Riyal Sign */
export const SAUDI_RIYAL_SYMBOL = '\u20C1';

/** Legacy Private-Use Area (PUA) code point supported by @emran-alhaddad/saudi-riyal-font */
export const SAUDI_RIYAL_PUA_SYMBOL = '\uE900';

/** Left-to-Right Mark (U+200E) ensuring deterministic left-of-numeral & negative sign ordering */
export const LRM = '\u200E';

/** Official SAMA Saudi Riyal Vector Path (viewBox="0 0 1256 1256") */
export const SAUDI_RIYAL_SVG_VIEWBOX = '0 0 1256 1256';
export const SAUDI_RIYAL_SVG_PATH =
  'M750,1119 C730,1163,716,1211,711,1262 C711,1262,1136,1172,1136,1172 C1156,1127,1169,1079,1174,1028 C1174,1028,750,1119,750,1119Z M1136,901 C1136,901,1136,901,1136,901 C1156,857,1169,809,1174,758 C1174,758,843,828,843,828 C843,828,843,693,843,693 C843,693,1136,631,1136,631 C1156,587,1169,538,1174,488 C1174,488,843,558,843,558 C843,558,843,72,843,72 C793,100,748,138,711,183 C711,183,711,586,711,586 C711,586,579,614,579,614 C579,614,579,6,579,6 C528,34,483,72,447,117 C447,117,447,642,447,642 C447,642,151,705,151,705 C131,750,117,798,112,849 C112,849,447,777,447,777 C447,777,447,948,447,948 C447,948,88,1024,88,1024 C68,1068,55,1117,50,1167 C50,1167,425,1088,425,1088 C456,1081,482,1063,499,1038 C499,1038,568,936,568,936 C568,936,568,936,568,936 C575,926,579,913,579,899 C579,899,579,749,579,749 C579,749,711,721,711,721 C711,721,711,992,711,992 C711,992,1136,901,1136,901Z';

export const SAMA_SRS_GUIDELINES = {
  authority: 'Saudi Central Bank (SAMA) — البنك المركزي السعودي',
  documentUrl: 'https://sama.gov.sa/ar-sa/Currency/SRS/Documents/Guidelines.pdf',
  unicodeCodePoint: 'U+20C1',
  legacyPuaCodePoint: 'U+E900',
  isoCurrencyCode: 'SAR',
  rules: {
    symbolPlacement: 'LEFT_OF_NUMERAL',
    spacingBetweenSymbolAndDigits: 'MANDATORY_SINGLE_SPACE',
    negativeNumberFormat: 'SYMBOL_SPACE_MINUS_DIGITS',
    geometricProportion: 'MATCH_TEXT_CAP_HEIGHT_1_TO_1_ASPECT',
    colorAndContrast: 'MONOCHROME_CURRENT_COLOR_HIGH_CONTRAST',
  },
} as const;

export interface FormatSaudiRiyalOptions {
  decimals?: number;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  locale?: 'en-US' | 'ar-SA';
  showPlusSign?: boolean;
  compact?: boolean;
  directionContext?: 'rtl' | 'ltr';
}

/**
 * Formats a numerical amount with the official SAMA Saudi Riyal Symbol (`\u20C1`).
 * Guarantees that in both RTL (`dir="rtl"`) and LTR (`dir="ltr"`) layouts:
 * - The symbol `⃁` is visually positioned to the LEFT of the numeral.
 * - A clear space separates the symbol and the numeral.
 * - For negative amounts, the minus sign sits between the symbol and the digits (`⃁ -1,250.00`).
 */
export function formatSaudiRiyal(
  amount: number | string | null | undefined,
  options: FormatSaudiRiyalOptions = {}
): string {
  const numeric =
    typeof amount === 'number'
      ? amount
      : typeof amount === 'string'
        ? parseFloat(amount.replace(/[^\d.-]/g, ''))
        : 0;

  const safeAmount = Number.isFinite(numeric) ? numeric : 0;
  const isNegative = safeAmount < 0;
  const absAmount = Math.abs(safeAmount);

  const locale = options.locale ?? 'en-US';
  const minFrac =
    options.decimals !== undefined
      ? options.decimals
      : options.minimumFractionDigits !== undefined
        ? options.minimumFractionDigits
        : 2;
  const maxFrac =
    options.decimals !== undefined
      ? options.decimals
      : options.maximumFractionDigits !== undefined
        ? options.maximumFractionDigits
        : Math.max(minFrac, 2);

  let formattedDigits: string;
  if (options.compact && absAmount >= 1_000_000) {
    formattedDigits = `${(absAmount / 1_000_000).toFixed(2)}M`;
  } else if (options.compact && absAmount >= 1_000) {
    formattedDigits = `${(absAmount / 1_000).toFixed(0)}k`;
  } else {
    formattedDigits = absAmount.toLocaleString(locale, {
      minimumFractionDigits: minFrac,
      maximumFractionDigits: maxFrac,
    });
  }

  const signPrefix = isNegative ? `${LRM}-` : options.showPlusSign && safeAmount > 0 ? `${LRM}+` : '';

  if (options.directionContext === 'ltr') {
    return `${LRM}${SAUDI_RIYAL_SYMBOL} ${signPrefix}${formattedDigits}`;
  }

  // Default RTL context (`<html lang="ar" dir="rtl">`):
  // Writing `${signPrefix}${formattedDigits} \u20C1` places the number on the right, space in the middle,
  // and the Saudi Riyal symbol `\u20C1` on the physical LEFT of the numeral!
  return `${signPrefix}${formattedDigits} ${SAUDI_RIYAL_SYMBOL}`;
}

export interface SamaRiyalComplianceReport {
  isCompliant: boolean;
  hasOfficialSymbol: boolean;
  hasLegacyAbbreviation: boolean;
  hasMandatorySpace: boolean;
  hasValidNegativePlacement: boolean;
  violations: string[];
}

/**
 * Audits a formatted currency display string against the official SAMA Saudi Riyal Symbol Guidelines.
 */
export function validateSamaRiyalCompliance(text: string): SamaRiyalComplianceReport {
  const violations: string[] = [];
  const hasOfficialSymbol = text.includes(SAUDI_RIYAL_SYMBOL) || text.includes(SAUDI_RIYAL_PUA_SYMBOL);
  const hasLegacyAbbreviation = /ر\.س/.test(text);

  if (!hasOfficialSymbol) {
    violations.push('MISSING_OFFICIAL_SAMA_SYMBOL_U20C1');
  }
  if (hasLegacyAbbreviation) {
    violations.push('LEGACY_TEXT_ABBREVIATION_DETECTED');
  }

  // Ensure symbol is never glued directly to digits without a space
  const isGluedToDigit =
    /[\d\u0660-\u0669][\u20C1\uE900]/.test(text) || /[\u20C1\uE900][\d\u0660-\u0669]/.test(text);
  const hasMandatorySpace = hasOfficialSymbol && !isGluedToDigit;
  if (!hasMandatorySpace) {
    violations.push('MISSING_SPACE_BETWEEN_SYMBOL_AND_NUMERAL');
  }

  // Negative sign must not appear after the digits (`1,250.00- ⃁`) or before the symbol in LTR (`-⃁ 1,250`)
  const hasInvalidTrailingMinus = /[\d\u0660-\u0669]-\s*[\u20C1\uE900]/.test(text);
  const hasInvalidLeadingMinusBeforeSymbol = /-\s*[\u20C1\uE900]\s*[\d\u0660-\u0669]/.test(text);
  const hasValidNegativePlacement = !hasInvalidTrailingMinus && !hasInvalidLeadingMinusBeforeSymbol;
  if (!hasValidNegativePlacement) {
    violations.push('INVALID_NEGATIVE_SIGN_PLACEMENT');
  }

  return {
    isCompliant: violations.length === 0,
    hasOfficialSymbol,
    hasLegacyAbbreviation,
    hasMandatorySpace,
    hasValidNegativePlacement,
    violations,
  };
}

/**
 * Converts any legacy `ر.س` strings into SAMA-compliant `\u20C1` strings with proper negative sign LRM anchoring.
 */
export function replaceLegacyRiyalWithSamaSymbol(text: string): string {
  return text
    .replace(/(^|[\s(>])-\s*(\d[\d,.]*)\s*ر\.س/g, `$1${LRM}-$2 ${SAUDI_RIYAL_SYMBOL}`)
    .replace(/ر\.س/g, SAUDI_RIYAL_SYMBOL);
}
