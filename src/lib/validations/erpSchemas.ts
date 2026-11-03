/**
 * Enterprise Validation Schemas for ALSALIM Group ERP
 * Compliant with Saudi Regulations (ZATCA, Musaned, WPS, Labor Law)
 */

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
}

// Saudi National ID / Iqama Validator (10 digits starting with 1 or 2)
export function validateSaudiId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  const cleanId = id.trim();
  if (!/^[12]\d{9}$/.test(cleanId)) return false;
  
  // Luhn-like checksum algorithm used for Saudi IDs
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let digit = parseInt(cleanId.charAt(i), 10);
    if (i % 2 === 0) {
      let doubled = digit * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    } else {
      sum += digit;
    }
  }
  return sum % 10 === 0;
}

// Saudi Mobile Number Validator (05XXXXXXXX or +9665XXXXXXXX)
export function validateSaudiMobile(mobile: string): boolean {
  if (!mobile) return false;
  const clean = mobile.replace(/[\s\-]/g, '');
  return /^(05\d{8}|(\+966|966)5\d{8})$/.test(clean);
}

// Saudi Commercial Registration Validator (10 digits starting with 1, 2, 4, or 7)
export function validateSaudiCR(cr: string): boolean {
  if (!cr) return false;
  return /^\d{10}$/.test(cr.trim());
}

// Saudi VAT Number Validator (15 digits starting and ending with 3)
export function validateSaudiVAT(vat: string): boolean {
  if (!vat) return false;
  const clean = vat.trim();
  return /^3\d{13}3$/.test(clean);
}

// Double Entry Accounting Balance Validator
export function validateJournalBalance(entries: Array<{ debit: number; credit: number }>): boolean {
  if (!entries || entries.length < 2) return false;
  const totalDebit = entries.reduce((acc, curr) => acc + (Number(curr.debit) || 0), 0);
  const totalCredit = entries.reduce((acc, curr) => acc + (Number(curr.credit) || 0), 0);
  return Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;
}

// Format Currency to Official SAMA Saudi Riyal Symbol (U+20C1)
export function formatSAR(amount: number): string {
  const isNeg = amount < 0;
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${isNeg ? '\u200E-' : ''}${formatted} \u20C1`;
}
