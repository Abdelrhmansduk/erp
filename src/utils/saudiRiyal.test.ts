import { describe, expect, it } from 'vitest';
import {
  LRM,
  SAMA_SRS_GUIDELINES,
  SAUDI_RIYAL_SVG_PATH,
  SAUDI_RIYAL_SVG_VIEWBOX,
  SAUDI_RIYAL_SYMBOL,
  formatSaudiRiyal,
  replaceLegacyRiyalWithSamaSymbol,
  validateSamaRiyalCompliance,
} from './saudiRiyal';
import { formatSAR } from '../lib/validations/erpSchemas';

describe('SAMA Saudi Riyal Symbol (SRS) Guidelines Engine', () => {
  it('exposes official SAMA SRS metadata and vector geometry', () => {
    expect(SAUDI_RIYAL_SYMBOL).toBe('\u20C1');
    expect(SAMA_SRS_GUIDELINES.documentUrl).toBe(
      'https://sama.gov.sa/ar-sa/Currency/SRS/Documents/Guidelines.pdf'
    );
    expect(SAMA_SRS_GUIDELINES.rules.symbolPlacement).toBe('LEFT_OF_NUMERAL');
    expect(SAMA_SRS_GUIDELINES.rules.spacingBetweenSymbolAndDigits).toBe('MANDATORY_SINGLE_SPACE');
    expect(SAMA_SRS_GUIDELINES.rules.negativeNumberFormat).toBe('SYMBOL_SPACE_MINUS_DIGITS');
    expect(SAUDI_RIYAL_SVG_VIEWBOX).toBe('0 0 1256 1256');
    expect(SAUDI_RIYAL_SVG_PATH.length).toBeGreaterThan(200);
  });

  it('formats positive and zero amounts with official symbol and mandatory space', () => {
    const zero = formatSaudiRiyal(0);
    expect(zero).toBe(`0.00 ${SAUDI_RIYAL_SYMBOL}`);
    expect(validateSamaRiyalCompliance(zero).isCompliant).toBe(true);

    const positive = formatSaudiRiyal(14500.5);
    expect(positive).toBe(`14,500.50 ${SAUDI_RIYAL_SYMBOL}`);
    expect(validateSamaRiyalCompliance(positive).isCompliant).toBe(true);
  });

  it('formats negative amounts with LRM-anchored minus sign between symbol and digits in RTL', () => {
    const negative = formatSaudiRiyal(-65000);
    expect(negative).toBe(`${LRM}-65,000.00 ${SAUDI_RIYAL_SYMBOL}`);
    const report = validateSamaRiyalCompliance(negative);
    expect(report.isCompliant).toBe(true);
    expect(report.hasValidNegativePlacement).toBe(true);
  });

  it('supports LTR context and compact notation while preserving SAMA rules', () => {
    const ltrFormatted = formatSaudiRiyal(2500, { directionContext: 'ltr', decimals: 0 });
    expect(ltrFormatted).toBe(`${LRM}${SAUDI_RIYAL_SYMBOL} 2,500`);
    expect(validateSamaRiyalCompliance(ltrFormatted).isCompliant).toBe(true);

    const compactMillions = formatSaudiRiyal(2450000, { compact: true });
    expect(compactMillions).toBe(`2.45M ${SAUDI_RIYAL_SYMBOL}`);
    expect(validateSamaRiyalCompliance(compactMillions).isCompliant).toBe(true);
  });

  it('detects SAMA SRS guideline violations (legacy ر.س, missing space, invalid minus)', () => {
    const legacyReport = validateSamaRiyalCompliance('1,500.00 ر.س');
    expect(legacyReport.isCompliant).toBe(false);
    expect(legacyReport.hasLegacyAbbreviation).toBe(true);

    const gluedReport = validateSamaRiyalCompliance(`1,500.00${SAUDI_RIYAL_SYMBOL}`);
    expect(gluedReport.isCompliant).toBe(false);
    expect(gluedReport.hasMandatorySpace).toBe(false);

    const badMinusReport = validateSamaRiyalCompliance(`-${SAUDI_RIYAL_SYMBOL} 1,500.00`);
    expect(badMinusReport.isCompliant).toBe(false);
    expect(badMinusReport.hasValidNegativePlacement).toBe(false);
  });

  it('converts legacy ر.س strings and integrates with formatSAR validator helper', () => {
    const converted = replaceLegacyRiyalWithSamaSymbol('إجمالي القيد: -45,000.00 ر.س');
    expect(converted).toContain(`${LRM}-45,000.00 ${SAUDI_RIYAL_SYMBOL}`);
    expect(validateSamaRiyalCompliance(converted).isCompliant).toBe(true);

    const sarHelperOut = formatSAR(13800);
    expect(sarHelperOut).toBe(`13,800.00 ${SAUDI_RIYAL_SYMBOL}`);
    expect(validateSamaRiyalCompliance(sarHelperOut).isCompliant).toBe(true);
  });
});
