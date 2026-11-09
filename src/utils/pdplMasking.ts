/**
 * Saudi PDPL (نظام حماية البيانات الشخصية) Data Masking Utilities (rules.md §4.3).
 * Ensures National IDs, Iqamas, Passports, IBANs, and phone numbers are masked for non-authorized roles.
 */

const UNMASKED_PRIVILEGED_ROLES = new Set([
  'SUPER_ADMIN',
  'GENERAL_MANAGER',
  'FINANCE_DIRECTOR',
  'HR_RECRUITMENT_OFFICER',
]);

export function canViewUnmaskedPii(role?: string | null): boolean {
  if (!role) return false;
  return UNMASKED_PRIVILEGED_ROLES.has(role.toUpperCase());
}

/**
 * Masks Saudi National ID or Iqama (10 digits), preserving first 2 and last 2 digits: `10******89`.
 */
export function maskNationalId(idValue: string | null | undefined, role?: string | null): string {
  if (!idValue) return '—';
  const cleaned = String(idValue).trim();
  if (canViewUnmaskedPii(role)) return cleaned;
  if (cleaned.length <= 4) return '****';
  return `${cleaned.slice(0, 2)}${'*'.repeat(Math.max(4, cleaned.length - 4))}${cleaned.slice(-2)}`;
}

/**
 * Masks Passport number, preserving first character and last 2 digits: `E*****42`.
 */
export function maskPassport(passport: string | null | undefined, role?: string | null): string {
  if (!passport) return '—';
  const cleaned = String(passport).trim();
  if (canViewUnmaskedPii(role)) return cleaned;
  if (cleaned.length <= 3) return '***';
  return `${cleaned.slice(0, 1)}${'*'.repeat(Math.max(4, cleaned.length - 3))}${cleaned.slice(-2)}`;
}

/**
 * Masks Saudi phone number, preserving prefix and last 3 digits: `+9665*****123`.
 */
export function maskPhone(phone: string | null | undefined, role?: string | null): string {
  if (!phone) return '—';
  const cleaned = String(phone).trim();
  if (canViewUnmaskedPii(role)) return cleaned;
  if (cleaned.length <= 5) return '*****';
  return `${cleaned.slice(0, 4)}${'*'.repeat(Math.max(4, cleaned.length - 7))}${cleaned.slice(-3)}`;
}

/**
 * Masks Saudi IBAN (24 chars starting with SA), preserving `SA` + 2 check digits and last 4 digits.
 */
export function maskIban(iban: string | null | undefined, role?: string | null): string {
  if (!iban) return '—';
  const cleaned = String(iban).replace(/\s+/g, '').trim();
  if (canViewUnmaskedPii(role)) return cleaned;
  if (cleaned.length <= 8) return 'SA****************';
  return `${cleaned.slice(0, 4)}${'*'.repeat(Math.max(8, cleaned.length - 8))}${cleaned.slice(-4)}`;
}

/**
 * Applies PDPL masking across an object record containing sensitive PII fields.
 */
export function maskSensitiveRecord<T extends Record<string, unknown>>(
  record: T,
  role?: string | null
): T {
  if (canViewUnmaskedPii(role)) return record;
  const clone: Record<string, unknown> = { ...record };

  for (const key of Object.keys(clone)) {
    const val = clone[key];
    if (typeof val !== 'string') continue;
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('iqama') || lowerKey.includes('national_id') || lowerKey === 'id_number') {
      clone[key] = maskNationalId(val, role);
    } else if (lowerKey.includes('passport')) {
      clone[key] = maskPassport(val, role);
    } else if (lowerKey.includes('iban')) {
      clone[key] = maskIban(val, role);
    } else if (lowerKey.includes('phone') || lowerKey.includes('mobile')) {
      clone[key] = maskPhone(val, role);
    }
  }

  return clone as T;
}
