/**
 * Smart CV & Passport Extractor + ICAO 9303 MRZ Parser + Duplicate/Backout Radar
 * + Per-Office White-Label Export Presets (`SHEGER` 2-Page A4 Standard).
 *
 * Khalid Al-Sulaim Holding Group ERP
 */

import { realErpDataStore } from './realErpDataStore';
import {
  getMusanedTransactions,
  type RecruitmentSubsidiaryCode,
} from './externalAgencyMasterService';

export interface ParsedMrzResult {
  validFormat: boolean;
  checkDigitsValid: boolean;
  documentType: string;
  issuingCountryCode: string;
  nationalityCode: string;
  nationalityAr: string;
  surnameEn: string;
  givenNamesEn: string;
  fullNameEn: string;
  passportNumber: string;
  dateOfBirthIso: string;
  age: number;
  gender: 'F' | 'M';
  expiryDateIso: string;
  monthsUntilExpiry: number;
  isExpired: boolean;
  isUnderSixMonths: boolean;
  rawLine1: string;
  rawLine2: string;
}

export interface SmartExtractedCvDraft {
  sourceFileName: string;
  fullNameEn: string;
  fullNameAr: string;
  positionEn: string;
  positionAr: string;
  monthlySalarySar: number;
  contractPeriodYears: number;
  nationalityAr: string;
  nationalityEn: string;
  religionAr: string;
  religionEn: string;
  dateOfBirthIso: string;
  age: number;
  gender: 'F' | 'M';
  maritalStatusAr: string;
  maritalStatusEn: string;
  childrenCount: number;
  livingTown: string;
  labourId: string;
  heightCm: number;
  weightKg: number;
  educationEn: string;
  educationAr: string;
  experienceType: 'First-Timer' | 'Experienced';
  experienceCountryAr: string;
  experienceYears: number;
  passportNumber: string;
  passportIssueDateIso: string;
  passportExpiryDateIso: string;
  passportIssuePlace: string;
  englishStars: number;
  arabicStars: number;
  skills: {
    cleaning: boolean;
    washing: boolean;
    ironing: boolean;
    babySitting: boolean;
    childrenCare: boolean;
    elderlyCare: boolean;
    cookingArabic: boolean;
    sewing: boolean;
    tutoring: boolean;
  };
  videoUrl: string;
  portraitDataUrl?: string;
  fullBodyDataUrl?: string;
  passportScanDataUrl?: string;
  mrzResult?: ParsedMrzResult;
  extractionConfidence: number;
  warningsAr: string[];
}

export interface DuplicateAndBlacklistCheck {
  hasRisk: boolean;
  isDuplicateInCvBank: boolean;
  isPreviousBackout: boolean;
  isPreviousRunaway: boolean;
  matchedAgencyName?: string;
  matchedContractNo?: string;
  reasonsAr: string[];
}

export interface OfficeCvExportPreset {
  id: string;
  officeCode: RecruitmentSubsidiaryCode | 'INTERNAL_AUDIT' | string;
  presetNameAr: string;
  presetNameEn: string;
  companyNameAr: string;
  companyNameEn: string;
  musanedLicenseNo: string;
  crNumber: string;
  salesPhones: string[];
  salesWhatsapp: string;
  salesEmail: string;
  addressAr: string;
  headerBgHex: string;
  accentBandHex: string;
  hideForeignAgencyIdentity: boolean;
  maskPassportBeforeContract: boolean;
  pricingDisplayMode: 'RECRUITMENT_SALARY' | 'RENTAL_PACKAGE';
  rentalMonthlyPackageSar?: number;
  warrantyClauseAr: string;
}

const ICAO_COUNTRY_MAP: Record<string, { ar: string; en: string }> = {
  ETH: { ar: 'أثيوبيا', en: 'ETHIOPIA' },
  PHL: { ar: 'الفلبين', en: 'PHILIPPINES' },
  KEN: { ar: 'كينيا', en: 'KENYA' },
  UGA: { ar: 'أوغندا', en: 'UGANDA' },
  BGD: { ar: 'بنجلادش', en: 'BANGLADESH' },
  IND: { ar: 'الهند', en: 'INDIA' },
  LKA: { ar: 'سريلانكا', en: 'SRI LANKA' },
  BDI: { ar: 'بوروندي', en: 'BURUNDI' },
  TZA: { ar: 'تنزانيا', en: 'TANZANIA' },
};

const CUSTOM_PRESETS_KEY = 'ALSULAIM_OFFICE_CV_EXPORT_PRESETS_V1';

export const DEFAULT_OFFICE_CV_PRESETS: OfficeCvExportPreset[] = [
  {
    id: 'PRESET-SAF',
    officeCode: 'SAF',
    presetNameAr: 'قالب شركة السفير الماسي للاستقدام (White-Label للعميل)',
    presetNameEn: 'Al-Safir Al-Masi Official Client CV',
    companyNameAr: 'شركة السفير الماسي للاستقدام',
    companyNameEn: 'AL-SAFIR AL-MASI RECRUITMENT CO.',
    musanedLicenseNo: '3810192',
    crNumber: '1010123456',
    salesPhones: ['920001234', '0500112201', '0500112202'],
    salesWhatsapp: '+966500112201',
    salesEmail: 'sales.safir@kas.sa',
    addressAr: 'المملكة العربية السعودية — الرياض — طريق الملك فهد',
    headerBgHex: '#141414',
    accentBandHex: '#f3f3f3',
    hideForeignAgencyIdentity: true,
    maskPassportBeforeContract: true,
    pricingDisplayMode: 'RECRUITMENT_SALARY',
    warrantyClauseAr: 'ضمان نظامي شامل لمدة 90 يوماً عبر منصة مساند (يشمل رفض العمل، الهروب، وعدم اللياقة الطبية).',
  },
  {
    id: 'PRESET-TOP',
    officeCode: 'TOP',
    presetNameAr: 'قالب شركة توباز للاستقدام (White-Label للعميل)',
    presetNameEn: 'Topaz Recruitment Official Client CV',
    companyNameAr: 'شركة توباز للاستقدام',
    companyNameEn: 'TOPAZ RECRUITMENT COMPANY',
    musanedLicenseNo: '3910445',
    crNumber: '1010345678',
    salesPhones: ['920004567', '0550334401', '0550334402'],
    salesWhatsapp: '+966550334401',
    salesEmail: 'sales.topaz@kas.sa',
    addressAr: 'المملكة العربية السعودية — الرياض — حي العليا',
    headerBgHex: '#141414',
    accentBandHex: '#f3f3f3',
    hideForeignAgencyIdentity: true,
    maskPassportBeforeContract: true,
    pricingDisplayMode: 'RECRUITMENT_SALARY',
    warrantyClauseAr: 'ضمان نظامي شامل لمدة 90 يوماً معتمد من وزارة الموارد البشرية ومنصة مساند.',
  },
  {
    id: 'PRESET-YAQ',
    officeCode: 'YAQ',
    presetNameAr: 'قالب شركة ياقوت نجد (استقدام + باقات التأجير الشهري)',
    presetNameEn: 'Yaqoot Najd Staffing & Flexible Rental CV',
    companyNameAr: 'شركة ياقوت نجد لتشغيل الكوادر والتأجير',
    companyNameEn: 'YAQOOT NAJD STAFFING & RENTAL CO.',
    musanedLicenseNo: '3920881',
    crNumber: '1010234567',
    salesPhones: ['920007890', '0540556601'],
    salesWhatsapp: '+966540556601',
    salesEmail: 'sales.yaqoot@kas.sa',
    addressAr: 'المملكة العربية السعودية — الرياض — طريق خريص',
    headerBgHex: '#141414',
    accentBandHex: '#f3f3f3',
    hideForeignAgencyIdentity: true,
    maskPassportBeforeContract: true,
    pricingDisplayMode: 'RENTAL_PACKAGE',
    rentalMonthlyPackageSar: 2450,
    warrantyClauseAr: 'تشغيل مرن بعقد شهري شامل الإقامة والتأمين الطبي والاستبدال الفوري طوال فترة التعاقد.',
  },
  {
    id: 'PRESET-DAR',
    officeCode: 'DAR',
    presetNameAr: 'قالب دار الرواد للاستقدام ونقل الخدمات (White-Label للعميل)',
    presetNameEn: 'Dar Al-Rowad Recruitment & Transfer CV',
    companyNameAr: 'دار الرواد للاستقدام ونقل الخدمات',
    companyNameEn: 'DAR AL-ROWAD RECRUITMENT & SERVICES',
    musanedLicenseNo: '3940119',
    crNumber: '1010998877',
    salesPhones: ['920009988', '0530778801'],
    salesWhatsapp: '+966530778801',
    salesEmail: 'sales.dar@kas.sa',
    addressAr: 'المملكة العربية السعودية — الرياض — المقر التشغيلي',
    headerBgHex: '#141414',
    accentBandHex: '#f3f3f3',
    hideForeignAgencyIdentity: true,
    maskPassportBeforeContract: true,
    pricingDisplayMode: 'RECRUITMENT_SALARY',
    warrantyClauseAr: 'ضمان نظامي لمدة 90 يوماً وفق لوائح منصة مساند ووزارة الموارد البشرية.',
  },
  {
    id: 'PRESET-AUDIT',
    officeCode: 'INTERNAL_AUDIT',
    presetNameAr: 'نسخة التدقيق الداخلي للمتابعة (إسلام ومحمود — بيانات كاملة)',
    presetNameEn: 'Internal Follow-up Audit View (Unmasked)',
    companyNameAr: 'قسم المتابعة الخارجية والوكلاء — نسخة تدقيق داخلي',
    companyNameEn: 'INTERNAL FOLLOW-UP & AGENCY AUDIT COPY',
    musanedLicenseNo: 'INTERNAL',
    crNumber: '1010892019',
    salesPhones: ['920001234'],
    salesWhatsapp: '+966500112233',
    salesEmail: 'i.mahmoud.followup@kas.sa',
    addressAr: 'للاستخدام الداخلي فقط — يُحظر إرسال هذه النسخة للعملاء',
    headerBgHex: '#262626',
    accentBandHex: '#f0f0f0',
    hideForeignAgencyIdentity: false,
    maskPassportBeforeContract: false,
    pricingDisplayMode: 'RECRUITMENT_SALARY',
    warrantyClauseAr: 'نسخة مطابقة تتضمن اسم الوكيل الخارجي ورقم الجواز الكامل والـ Labour ID لأغراض التفويض والتدقيق.',
  },
];

export function normalizeOfficeCvPresetRecord(raw: any): OfficeCvExportPreset | null {
  if (!raw || !raw.id) return null;
  return {
    id: String(raw.id),
    officeCode: String(raw.officeCode || raw.office_code || 'SAF'),
    presetNameAr: String(raw.presetNameAr || raw.preset_name_ar || ''),
    presetNameEn: String(raw.presetNameEn || raw.preset_name_en || ''),
    companyNameAr: String(raw.companyNameAr || raw.company_name_ar || ''),
    companyNameEn: String(raw.companyNameEn || raw.company_name_en || ''),
    musanedLicenseNo: String(raw.musanedLicenseNo || raw.musaned_license_no || ''),
    crNumber: String(raw.crNumber || raw.cr_number || ''),
    salesPhones: Array.isArray(raw.salesPhones)
      ? raw.salesPhones
      : Array.isArray(raw.sales_phones)
        ? raw.sales_phones
        : [],
    salesWhatsapp: String(raw.salesWhatsapp || raw.sales_whatsapp || ''),
    salesEmail: String(raw.salesEmail || raw.sales_email || 'info@kas.sa'),
    addressAr: String(raw.addressAr || raw.address_ar || ''),
    headerBgHex: String(raw.headerBgHex || raw.header_bg_hex || '#141414'),
    accentBandHex: String(raw.accentBandHex || raw.accent_band_hex || '#262626'),
    hideForeignAgencyIdentity:
      raw.hideForeignAgencyIdentity !== undefined
        ? Boolean(raw.hideForeignAgencyIdentity)
        : raw.hide_foreign_agency_identity !== undefined
          ? Boolean(raw.hide_foreign_agency_identity)
          : true,
    maskPassportBeforeContract:
      raw.maskPassportBeforeContract !== undefined
        ? Boolean(raw.maskPassportBeforeContract)
        : raw.mask_passport_before_contract !== undefined
          ? Boolean(raw.mask_passport_before_contract)
          : true,
    pricingDisplayMode:
      (raw.pricingDisplayMode || raw.pricing_display_mode) === 'RENTAL_PACKAGE'
        ? 'RENTAL_PACKAGE'
        : 'RECRUITMENT_SALARY',
    rentalMonthlyPackageSar:
      raw.rentalMonthlyPackageSar !== undefined
        ? Number(raw.rentalMonthlyPackageSar)
        : raw.rental_monthly_package_sar !== undefined
          ? Number(raw.rental_monthly_package_sar)
          : undefined,
    warrantyClauseAr: String(raw.warrantyClauseAr || raw.warranty_clause_ar || ''),
  };
}

export function getOfficeCvPresets(): OfficeCvExportPreset[] {
  try {
    if (typeof localStorage === 'undefined') return [...DEFAULT_OFFICE_CV_PRESETS];
    const raw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    if (!raw) return [...DEFAULT_OFFICE_CV_PRESETS];
    const custom = JSON.parse(raw);
    if (!Array.isArray(custom)) return [...DEFAULT_OFFICE_CV_PRESETS];
    const mergedMap = new Map<string, OfficeCvExportPreset>();
    DEFAULT_OFFICE_CV_PRESETS.forEach((p) => mergedMap.set(p.id, p));
    custom.forEach((item: any) => {
      const normalized = normalizeOfficeCvPresetRecord(item);
      if (normalized?.id) mergedMap.set(normalized.id, normalized);
    });
    return Array.from(mergedMap.values());
  } catch {
    return [...DEFAULT_OFFICE_CV_PRESETS];
  }
}

export async function loadOfficeCvPresets(): Promise<OfficeCvExportPreset[]> {
  const mergedMap = new Map<string, OfficeCvExportPreset>();
  getOfficeCvPresets().forEach((p) => mergedMap.set(p.id, p));
  try {
    const cloudRows = await realErpDataStore.getRecords<any>('office_cv_export_presets', [], 'all');
    for (const row of cloudRows) {
      const normalized = normalizeOfficeCvPresetRecord(row);
      if (normalized?.id) {
        mergedMap.set(normalized.id, normalized);
      }
    }
    const merged = Array.from(mergedMap.values());
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(merged));
    }
    return merged;
  } catch {
    return Array.from(mergedMap.values());
  }
}

export async function saveCustomOfficeCvPreset(preset: OfficeCvExportPreset): Promise<OfficeCvExportPreset[]> {
  const current = await loadOfficeCvPresets();
  const idx = current.findIndex((p) => p.id === preset.id);
  if (idx >= 0) current[idx] = preset;
  else current.push(preset);

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(current));
    }
  } catch {
    // ignore
  }

  const dbRow: { id: string; [key: string]: any } = {
    id: preset.id,
    company_id: preset.officeCode === 'SAF' || preset.officeCode === 'QAS' || preset.officeCode === 'SHA' || preset.officeCode === 'SHAR' || preset.officeCode === 'YAQ'
      ? preset.officeCode
      : 'all',
    office_code: preset.officeCode,
    preset_name_ar: preset.presetNameAr,
    preset_name_en: preset.presetNameEn,
    company_name_ar: preset.companyNameAr,
    company_name_en: preset.companyNameEn,
    musaned_license_no: preset.musanedLicenseNo,
    cr_number: preset.crNumber,
    sales_phones: preset.salesPhones,
    sales_whatsapp: preset.salesWhatsapp,
    sales_email: preset.salesEmail,
    address_ar: preset.addressAr,
    header_bg_hex: preset.headerBgHex,
    accent_band_hex: preset.accentBandHex,
    hide_foreign_agency_identity: preset.hideForeignAgencyIdentity,
    mask_passport_before_contract: preset.maskPassportBeforeContract,
    pricing_display_mode: preset.pricingDisplayMode,
    rental_monthly_package_sar: preset.rentalMonthlyPackageSar ?? null,
    warranty_clause_ar: preset.warrantyClauseAr,
    updated_at: new Date().toISOString(),
  };

  try {
    const existing = await realErpDataStore.getRecords<any>('office_cv_export_presets', [], 'all');
    if (existing.some((r) => String(r.id) === preset.id)) {
      await realErpDataStore.updateRecord<any>('office_cv_export_presets', preset.id, dbRow);
    } else {
      await realErpDataStore.addRecord<any>('office_cv_export_presets', dbRow);
    }
  } catch {
    // offline/local cache still holds the preset
  }

  return current;
}

export function maskPassportForClientPreview(passport: string, shouldMask: boolean): string {
  const clean = String(passport || '').trim().toUpperCase();
  if (!clean || !shouldMask || clean.length <= 4) return clean || '—';
  return `${clean.slice(0, 3)}${'•'.repeat(Math.max(3, clean.length - 5))}${clean.slice(-2)}`;
}

// ─── ICAO 9303 TD3 MRZ Parser & Check Digit Validator ───────────────────────

function mrzCharValue(ch: string): number {
  if (ch === '<') return 0;
  if (ch >= '0' && ch <= '9') return ch.charCodeAt(0) - 48;
  if (ch >= 'A' && ch <= 'Z') return ch.charCodeAt(0) - 55;
  return 0;
}

export function computeIcaoCheckDigit(segment: string): number {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < segment.length; i++) {
    sum += mrzCharValue(segment[i]) * weights[i % 3];
  }
  return sum % 10;
}

function parseMrzYYMMDD(yymmdd: string, isExpiry: boolean, nowYear = new Date().getFullYear()): string {
  if (!/^\d{6}$/.test(yymmdd)) return '';
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  let fullYear: number;
  if (isExpiry) {
    fullYear = 2000 + yy;
  } else {
    const pivot = (nowYear % 100) + 1;
    fullYear = yy <= pivot ? 2000 + yy : 1900 + yy;
  }
  return `${fullYear}-${mm}-${dd}`;
}

export function parsePassportMrz(
  rawText: string,
  referenceDate: Date = new Date()
): ParsedMrzResult | null {
  if (!rawText) return null;

  const lines = rawText
    .toUpperCase()
    .split(/[\r\n]+/)
    .map((l) => l.replace(/\s+/g, '').trim())
    .filter((l) => l.length >= 36);

  let line1 = '';
  let line2 = '';

  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].startsWith('P<') && /^[A-Z0-9<]{36,46}$/.test(lines[i + 1])) {
      line1 = lines[i].padEnd(44, '<').slice(0, 44);
      line2 = lines[i + 1].padEnd(44, '<').slice(0, 44);
      break;
    }
  }

  // Also scan contiguous text blocks if PDF stripped newlines between MRZ lines
  if (!line1) {
    const compact = rawText.toUpperCase().replace(/\s+/g, '');
    const match = compact.match(/(P<[A-Z<]{42})([A-Z0-9<]{9}\d[A-Z<]{3}\d{6}\d[FM<]\d{6}\d[A-Z0-9<]{14,16})/);
    if (match) {
      line1 = match[1].slice(0, 44);
      line2 = match[2].padEnd(44, '<').slice(0, 44);
    }
  }

  if (!line1 || !line2) return null;

  const docType = line1.slice(0, 2).replace(/</g, '');
  const issuingCountryCode = line1.slice(2, 5).replace(/</g, '');
  const namesSection = line1.slice(5);
  const [rawSurname = '', rawGiven = ''] = namesSection.split('<<');
  const surnameEn = rawSurname.replace(/<+/g, ' ').trim();
  const givenNamesEn = rawGiven.replace(/<+/g, ' ').trim();
  const fullNameEn = `${givenNamesEn} ${surnameEn}`.replace(/\s+/g, ' ').trim();

  const rawPassportField = line2.slice(0, 9);
  const passportCheckChar = line2[9];
  const passportNumber = rawPassportField.replace(/</g, '').trim();

  const nationalityCode = line2.slice(10, 13).replace(/</g, '');
  const dobRaw = line2.slice(13, 19);
  const dobCheckChar = line2[19];
  const genderChar = line2[20] === 'M' ? 'M' : 'F';
  const expRaw = line2.slice(21, 27);
  const expCheckChar = line2[27];

  const passOk = String(computeIcaoCheckDigit(rawPassportField)) === passportCheckChar;
  const dobOk = String(computeIcaoCheckDigit(dobRaw)) === dobCheckChar;
  const expOk = String(computeIcaoCheckDigit(expRaw)) === expCheckChar;

  const dateOfBirthIso = parseMrzYYMMDD(dobRaw, false, referenceDate.getFullYear());
  const expiryDateIso = parseMrzYYMMDD(expRaw, true, referenceDate.getFullYear());

  const dobDate = dateOfBirthIso ? new Date(`${dateOfBirthIso}T00:00:00Z`) : null;
  const expDate = expiryDateIso ? new Date(`${expiryDateIso}T00:00:00Z`) : null;

  const age = dobDate
    ? Math.max(
        18,
        Math.floor((referenceDate.getTime() - dobDate.getTime()) / (365.25 * 86_400_000))
      )
    : 25;

  const monthsUntilExpiry = expDate
    ? Math.round(((expDate.getTime() - referenceDate.getTime()) / (30.4375 * 86_400_000)) * 10) / 10
    : 24;

  const countryInfo = ICAO_COUNTRY_MAP[nationalityCode] || ICAO_COUNTRY_MAP[issuingCountryCode] || {
    ar: 'أثيوبيا',
    en: nationalityCode || 'ETHIOPIA',
  };

  return {
    validFormat: true,
    checkDigitsValid: passOk && dobOk && expOk,
    documentType: docType,
    issuingCountryCode,
    nationalityCode,
    nationalityAr: countryInfo.ar,
    surnameEn,
    givenNamesEn,
    fullNameEn: fullNameEn || surnameEn,
    passportNumber,
    dateOfBirthIso,
    age,
    gender: genderChar,
    expiryDateIso,
    monthsUntilExpiry,
    isExpired: monthsUntilExpiry <= 0,
    isUnderSixMonths: monthsUntilExpiry > 0 && monthsUntilExpiry < 6,
    rawLine1: line1,
    rawLine2: line2,
  };
}

// ─── Binary PDF Stream & Image Asset Scanner ────────────────────────────────

function uint8ToDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (let j = 0; j < sub.length; j++) {
      binary += String.fromCharCode(sub[j]);
    }
  }
  const b64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : (globalThis as any).Buffer?.from(bytes).toString('base64') || '';
  return `data:${mime};base64,${b64}`;
}

function extractPrintableTextFromBytes(bytes: Uint8Array, maxLen = 600_000): string {
  let out = '';
  const limit = Math.min(bytes.length, maxLen);
  for (let k = 0; k < limit; k++) {
    const b = bytes[k];
    if ((b >= 32 && b <= 126) || b === 10 || b === 13) {
      out += String.fromCharCode(b);
    } else if (out.length === 0 || out[out.length - 1] !== ' ') {
      out += ' ';
    }
  }
  return out;
}

async function tryDecompressDeflateChunk(chunk: Uint8Array): Promise<string> {
  if (typeof DecompressionStream === 'undefined') return '';
  for (const format of ['deflate', 'deflate-raw'] as const) {
    try {
      const ds = new DecompressionStream(format);
      const writer = ds.writable.getWriter();
      const copy = new Uint8Array(chunk.byteLength);
      copy.set(chunk);
      writer.write(copy).catch(() => {});
      writer.close().catch(() => {});
      const reader = ds.readable.getReader();
      const parts: Uint8Array[] = [];
      let total = 0;
      while (total < 400_000) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          parts.push(value);
          total += value.byteLength;
        }
      }
      if (total === 0) continue;
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const p of parts) {
        merged.set(p, offset);
        offset += p.byteLength;
      }
      // Decode PDF text operators `( ... ) Tj` / `TJ` inside decompressed content stream
      const decoded = extractPrintableTextFromBytes(merged, 400_000);
      const literalMatches = decoded.match(/\((?:\\.|[^()]){2,180}\)/g) || [];
      if (literalMatches.length > 0) {
        const cleaned = literalMatches
          .map((m) => m.slice(1, -1).replace(/\\([()\\])/g, '$1'))
          .join(' ');
        return `${decoded}\n${cleaned}`;
      }
      return decoded;
    } catch {
      // try next format
    }
  }
  return '';
}

export async function decompressPdfFlateStreams(bytes: Uint8Array): Promise<string> {
  if (typeof DecompressionStream === 'undefined') return '';
  let latin = '';
  const limit = Math.min(bytes.length, 2_500_000);
  for (let i = 0; i < limit; i++) {
    latin += String.fromCharCode(bytes[i]);
  }
  const chunks: Uint8Array[] = [];
  let cursor = 0;
  while (cursor < limit && chunks.length < 32) {
    const streamTokenIdx = latin.indexOf('stream', cursor);
    if (streamTokenIdx < 0) break;
    const dictWindow = latin.slice(Math.max(0, streamTokenIdx - 220), streamTokenIdx);
    let dataStart = streamTokenIdx + 6;
    if (latin[dataStart] === '\r' && latin[dataStart + 1] === '\n') dataStart += 2;
    else if (latin[dataStart] === '\n' || latin[dataStart] === '\r') dataStart += 1;

    const endStreamIdx = latin.indexOf('endstream', dataStart);
    if (endStreamIdx < 0) break;
    let dataEnd = endStreamIdx;
    while (dataEnd > dataStart && (bytes[dataEnd - 1] === 10 || bytes[dataEnd - 1] === 13)) {
      dataEnd--;
    }

    const isFlate =
      /\/FlateDecode/i.test(dictWindow) &&
      !/\/DCTDecode|\/JPXDecode|\/ImageB|\/ImageC/i.test(dictWindow);
    if (isFlate && dataEnd - dataStart >= 8 && dataEnd - dataStart <= 250_000) {
      chunks.push(bytes.subarray(dataStart, dataEnd));
    }
    cursor = endStreamIdx + 9;
  }

  if (chunks.length === 0) return '';
  const decompressedTexts = await Promise.all(chunks.map((c) => tryDecompressDeflateChunk(c)));
  return decompressedTexts.filter(Boolean).join('\n');
}

export function extractJpegsAndTextFromPdfBytes(buffer: ArrayBuffer): {
  extractedText: string;
  jpegDataUrls: string[];
  detectedUrls: string[];
} {
  const bytes = new Uint8Array(buffer);
  const jpegDataUrls: string[] = [];

  // Scan embedded JPEG streams (SOI 0xFF 0xD8 0xFF ... EOI 0xFF 0xD9) larger than 2.5 KB
  let i = 0;
  while (i < bytes.length - 4 && jpegDataUrls.length < 4) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
      let end = i + 3;
      while (end < bytes.length - 1) {
        if (bytes[end] === 0xff && bytes[end + 1] === 0xd9) {
          end += 2;
          break;
        }
        end++;
      }
      const len = end - i;
      if (len >= 2500 && len <= 2_500_000) {
        jpegDataUrls.push(uint8ToDataUrl(bytes.subarray(i, end), 'image/jpeg'));
      }
      i = end;
    } else {
      i++;
    }
  }

  // Decode printable text & URI annotations
  const ascii = extractPrintableTextFromBytes(bytes, 600_000);

  const urlMatches = ascii.match(/https?:\/\/[^\s)>\]"']+/gi) || [];
  const detectedUrls = Array.from(new Set(urlMatches.map((u) => u.replace(/[)\\]+$/, ''))));

  return {
    extractedText: ascii,
    jpegDataUrls,
    detectedUrls,
  };
}

export async function extractJpegsAndTextFromPdfBytesAsync(buffer: ArrayBuffer): Promise<{
  extractedText: string;
  jpegDataUrls: string[];
  detectedUrls: string[];
  usedFlateDecompression: boolean;
}> {
  const syncRes = extractJpegsAndTextFromPdfBytes(buffer);
  const flateText = await decompressPdfFlateStreams(new Uint8Array(buffer));
  if (!flateText) {
    return { ...syncRes, usedFlateDecompression: false };
  }
  const combinedText = `${syncRes.extractedText}\n${flateText}`;
  const urlMatches = combinedText.match(/https?:\/\/[^\s)>\]"']+/gi) || [];
  const detectedUrls = Array.from(
    new Set([...syncRes.detectedUrls, ...urlMatches.map((u) => u.replace(/[)\\]+$/, ''))])
  );
  return {
    extractedText: combinedText,
    jpegDataUrls: syncRes.jpegDataUrls,
    detectedUrls,
    usedFlateDecompression: true,
  };
}

// ─── Smart Bilingual CV Parser (`SHEGER` & Multi-Agency Layout) ─────────────

export async function extractSmartCvFromFile(
  file: File,
  rawTextHint?: string
): Promise<SmartExtractedCvDraft> {
  const warningsAr: string[] = [];
  const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
  const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name);

  let combinedText = rawTextHint || '';
  let portraitDataUrl: string | undefined;
  let fullBodyDataUrl: string | undefined;
  let passportScanDataUrl: string | undefined;
  let detectedVideoUrl = '';

  const buf = await file.arrayBuffer();
  if (isPdf) {
    const pdfData = await extractJpegsAndTextFromPdfBytesAsync(buf);
    combinedText = `${combinedText}\n${pdfData.extractedText}`;
    portraitDataUrl = pdfData.jpegDataUrls[0];
    fullBodyDataUrl = pdfData.jpegDataUrls[1];
    passportScanDataUrl = pdfData.jpegDataUrls[2];
    const vidCandidate = pdfData.detectedUrls.find((u) =>
      /youtube|youtu\.be|drive\.google|vimeo|mp4|video|tiktok|shorts/i.test(u)
    );
    detectedVideoUrl = vidCandidate || pdfData.detectedUrls[0] || '';
  } else if (isImage) {
    const mime = file.type || 'image/jpeg';
    portraitDataUrl = uint8ToDataUrl(new Uint8Array(buf), mime);
  }

  const mrz = parsePassportMrz(combinedText);
  if (mrz?.isExpired) {
    warningsAr.push(`تحذير حرج: جواز السفر (${mrz.passportNumber}) منتهي الصلاحية بتاريخ ${mrz.expiryDateIso}!`);
  } else if (mrz?.isUnderSixMonths) {
    warningsAr.push(
      `تنبيه صلاحية: جواز السفر (${mrz.passportNumber}) متبقٍ في سريانه أقل من 6 أشهر (${mrz.monthsUntilExpiry} شهر).`
    );
  }

  // Extract Labour ID (e.g. EF10500644)
  const labourMatch = combinedText.match(/\b(EF\d{6,10}|LB[-\s]?\d{6,10})\b/i);
  const labourId = labourMatch ? labourMatch[1].toUpperCase() : '';

  // Extract Passport fallback if MRZ wasn't present in text layer
  const passportFallbackMatch = combinedText.match(/\b(EP\d{7}|P\d{7,8}[A-Z]?|A\d{7,8}|UG\d{7}|AK\d{7})\b/i);
  const passportNumber =
    mrz?.passportNumber || (passportFallbackMatch ? passportFallbackMatch[1].toUpperCase() : '');

  // Salary
  const salaryMatch = combinedText.match(/(?:Monthly\s*Salary|Salary|الراتب)[^\d]{0,20}(\d{3,4})/i);
  const monthlySalarySar = salaryMatch ? parseInt(salaryMatch[1], 10) : 1000;

  // Living Town
  const townMatch = combinedText.match(/(?:Living\s*Town|Place\s*of\s*Birth|Town)[\s:]+([A-Za-z\s]{3,24})/i);
  const livingTown = townMatch ? townMatch[1].trim().toUpperCase() : 'ADDIS ABABA';

  // Religion
  const isMuslim = /muslim|islam|مسلم/i.test(combinedText);
  const isChristian = /christian|orthodox|catholic|مسيح/i.test(combinedText);
  const religionAr = isChristian && !isMuslim ? 'مسيحية' : 'مسلمة';
  const religionEn = isChristian && !isMuslim ? 'CHRISTIAN' : 'MUSLIM';

  // Marital Status
  const isMarried = /married|متزوج/i.test(combinedText);
  const maritalStatusAr = isMarried ? 'متزوجة' : 'عزباء';
  const maritalStatusEn = isMarried ? 'MARRIED' : 'SINGLE';

  // Experience
  const isExperienced = /experienced|prev\.?\s*exp|سبق\s*لها|سنتين|years\s*in/i.test(combinedText) && !/first[-\s]*timer/i.test(combinedText);
  const experienceType: 'First-Timer' | 'Experienced' = isExperienced ? 'Experienced' : 'First-Timer';

  // Education
  const eduMatch = combinedText.match(/\b(High\s*School|Secondary|Diploma|University|Primary)\b/i);
  const educationEn = eduMatch ? eduMatch[1].toUpperCase() : 'PRIMARY';
  const educationAr =
    educationEn.includes('HIGH') || educationEn.includes('SECONDARY')
      ? 'ثانوي'
      : educationEn.includes('DIPLOMA') || educationEn.includes('UNIVERSITY')
      ? 'دبلوم / جامعي'
      : 'ابتدائي / إعدادي';

  // Clean filename fallback for Candidate Name
  const cleanFileBase = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b(cv|resume|sheger|maid|candidate|\d{4,})\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  const nameMatch = combinedText.match(/(?:Full\s*Name|Applicant\s*Name)[\s:]+([A-Z][A-Z\s]{5,40})/);
  const fullNameEn =
    mrz?.fullNameEn ||
    (nameMatch ? nameMatch[1].trim() : '') ||
    (cleanFileBase.length >= 4 ? cleanFileBase : 'CANDIDATE FROM UPLOADED CV');

  const nationalityAr =
    mrz?.nationalityAr ||
    (/philippines|manila|فلبين/i.test(combinedText)
      ? 'الفلبين'
      : /kenya|nairobi|كينيا/i.test(combinedText)
      ? 'كينيا'
      : /uganda|kampala|اوغندا|أوغندا/i.test(combinedText)
      ? 'أوغندا'
      : /bangladesh|dhaka|بنجلادش/i.test(combinedText)
      ? 'بنجلادش'
      : 'أثيوبيا');

  const nationalityEn =
    nationalityAr === 'الفلبين'
      ? 'PHILIPPINES'
      : nationalityAr === 'كينيا'
      ? 'KENYA'
      : nationalityAr === 'أوغندا'
      ? 'UGANDA'
      : nationalityAr === 'بنجلادش'
      ? 'BANGLADESH'
      : 'ETHIOPIA';

  if (!passportNumber) {
    warningsAr.push('لم يتم العثور على سطر MRZ نصي مقروء — يرجى التحقق من رقم الجواز في شاشة المراجعة السريعة.');
  }

  return {
    sourceFileName: file.name,
    fullNameEn,
    fullNameAr: fullNameEn,
    positionEn: 'HOUSEMAID',
    positionAr: 'عاملة منزلية',
    monthlySalarySar,
    contractPeriodYears: 2,
    nationalityAr,
    nationalityEn,
    religionAr,
    religionEn,
    dateOfBirthIso: mrz?.dateOfBirthIso || '2001-05-14',
    age: mrz?.age || 25,
    gender: mrz?.gender || 'F',
    maritalStatusAr,
    maritalStatusEn,
    childrenCount: isMarried ? 1 : 0,
    livingTown,
    labourId,
    heightCm: 161,
    weightKg: 56,
    educationEn,
    educationAr,
    experienceType,
    experienceCountryAr: isExperienced ? 'خبرة سابقة بالخليج (سنتان)' : 'أول مرة (First-Timer)',
    experienceYears: isExperienced ? 2 : 0,
    passportNumber,
    passportIssueDateIso: '2024-09-19',
    passportExpiryDateIso: mrz?.expiryDateIso || '2029-09-18',
    passportIssuePlace: livingTown,
    englishStars: nationalityAr === 'الفلبين' || nationalityAr === 'كينيا' ? 4 : 3,
    arabicStars: isExperienced ? 4 : 2,
    skills: {
      cleaning: true,
      washing: true,
      ironing: true,
      babySitting: true,
      childrenCare: true,
      elderlyCare: true,
      cookingArabic: isExperienced,
      sewing: false,
      tutoring: nationalityAr === 'الفلبين',
    },
    videoUrl: detectedVideoUrl,
    portraitDataUrl,
    fullBodyDataUrl,
    passportScanDataUrl,
    mrzResult: mrz || undefined,
    extractionConfidence: mrz ? 98 : passportNumber ? 86 : 72,
    warningsAr,
  };
}

// ─── Duplicate Passport & Backout / Runaway Radar ───────────────────────────

export async function checkCandidateDuplicateAndBlacklist(
  passportNumber: string,
  labourId?: string
): Promise<DuplicateAndBlacklistCheck> {
  const cleanPass = String(passportNumber || '').trim().toUpperCase();
  const cleanLabour = String(labourId || '').trim().toUpperCase();

  if (!cleanPass && !cleanLabour) {
    return {
      hasRisk: false,
      isDuplicateInCvBank: false,
      isPreviousBackout: false,
      isPreviousRunaway: false,
      reasonsAr: [],
    };
  }

  const reasonsAr: string[] = [];
  let isDuplicateInCvBank = false;
  let isPreviousBackout = false;
  let isPreviousRunaway = false;
  let matchedAgencyName: string | undefined;
  let matchedContractNo: string | undefined;

  const existingCvs = await realErpDataStore.getRecords<any>('cvs', []);
  for (const cv of existingCvs) {
    const cvPass = String(cv.passport_number || '').trim().toUpperCase();
    const cvLab = String(cv.labour_id || '').trim().toUpperCase();
    if ((cleanPass && cvPass === cleanPass) || (cleanLabour && cvLab === cleanLabour)) {
      isDuplicateInCvBank = true;
      matchedAgencyName = cv.external_office;
      if (cv.status === 'تراجع') {
        isPreviousBackout = true;
        reasonsAr.push(
          `مسجلة سابقاً في سجل الاعتذار/رفض العمل (Backout) لدى مكتب (${cv.external_office || 'غير محدد'})!`
        );
      } else {
        reasonsAr.push(
          `رقم الجواز (${cleanPass}) مرفوع مسبقاً في بنك السير بحالة [${cv.status}] عبر وكالة (${cv.external_office || 'غير محدد'}).`
        );
      }
    }
  }

  const musanedTxs = await getMusanedTransactions();
  for (const tx of musanedTxs) {
    const txPass = String(tx.passport_number || '').trim().toUpperCase();
    if (cleanPass && txPass === cleanPass) {
      matchedContractNo = tx.musaned_contract_no;
      matchedAgencyName = matchedAgencyName || tx.agency_canonical_name;
      if (tx.stage === 'BACKOUT' || tx.backout_date) {
        isPreviousBackout = true;
        reasonsAr.push(
          `تحذير أرشيف المتابعة: العاملة مسجل عليها Backout سابق في عقد مساند #${tx.musaned_contract_no} (${tx.agency_canonical_name}).`
        );
      } else if (tx.stage === 'RUNAWAY' || tx.runaway_date) {
        isPreviousRunaway = true;
        reasonsAr.push(
          `حظر أمني: العاملة مسجل عليها بلاغ هروب/تغيب سابق في عقد مساند #${tx.musaned_contract_no}!`
        );
      }
    }
  }

  return {
    hasRisk: isDuplicateInCvBank || isPreviousBackout || isPreviousRunaway,
    isDuplicateInCvBank,
    isPreviousBackout,
    isPreviousRunaway,
    matchedAgencyName,
    matchedContractNo,
    reasonsAr,
  };
}

export interface SmartBatchCvExtractionItem {
  fileName: string;
  draft?: SmartExtractedCvDraft;
  blacklist?: DuplicateAndBlacklistCheck;
  error?: string;
}

export async function extractSmartCvsBatchFromFiles(
  files: File[]
): Promise<SmartBatchCvExtractionItem[]> {
  const results: SmartBatchCvExtractionItem[] = [];
  for (const file of files) {
    try {
      const draft = await extractSmartCvFromFile(file);
      const blacklist = await checkCandidateDuplicateAndBlacklist(draft.passportNumber, draft.fullNameEn);
      results.push({
        fileName: file.name,
        draft,
        blacklist,
      });
    } catch (e: any) {
      results.push({
        fileName: file.name,
        error: e?.message || 'تعذر قراءة ملف PDF أو استخراج بياناته',
      });
    }
  }
  return results;
}
