/**
 * Central Entity Legal Identity & Standalone Branding Resolver
 * Ensures every HR letter, payslip, contract, export, QR code, and WhatsApp/Email share
 * dynamically uses the employee's or record's actual company identity (SAF, YAQ, TOP, DAR, KAS, HQ),
 * with full support for hiding/omitting "مجموعة خالد السليم" (Holding Group branding) per-company or per-document.
 */

import { COMPANIES_LIST } from '../contexts/CompanyContext';
import { useAppStore } from '../stores/appStore';
import { decryptStoragePayload } from '../utils/securitySanitizers';

export type CanonicalEntityCode = 'SAF' | 'YAQ' | 'TOP' | 'DAR' | 'KAS' | 'HQ';

export interface EntityLegalProfile {
  code: CanonicalEntityCode;
  nameAr: string;
  shortNameAr: string;
  nameEn: string;
  crNumber: string;
  taxNumber: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  monogram: string;
  defaultHideHoldingGroup: boolean;
  hrDepartmentTitleAr: string;
  hrSignatoryNameAr: string;
  entityFinanceManagerAr: string;
  entityFinanceRoleAr: string;
  entityGeneralManagerAr: string;
  entityGeneralManagerRoleAr: string;
  musanedLicenseNo?: string;
  chamberMembershipNo?: string;
  gosiRegistrationNo?: string;
}

export const HOLDING_GROUP_INFO = {
  nameAr: 'مجموعة خالد السليم التجارية',
  holdingTitleAr: 'مجموعة خالد السليم القابضة',
  nameEn: 'KHALID AL-SULAIM COMMERCIAL GROUP',
  crNumber: '1010892019',
  taxNumber: '310928374100003',
  address: 'المملكة العربية السعودية - الرياض - طريق الملك فهد',
  phone: '920001234',
  email: 'info@alsulaim.sa',
  logoUrl: '/logos/group-logo.png',
  groupCfoNameAr: 'أ. محمد بن عبدالرحمن السليم',
  groupCfoRoleAr: 'المدير المالي التنفيذي (Group CFO)',
  groupChairmanNameAr: 'الشيخ خالد بن عبدالعزيز السليم',
  groupChairmanRoleAr: 'رئيس مجلس الإدارة / المفوض العام',
} as const;

export const ENTITY_LEGAL_PROFILES: Record<CanonicalEntityCode, EntityLegalProfile> = {
  SAF: {
    code: 'SAF',
    nameAr: 'شركة السفير الماسي للاستقدام',
    shortNameAr: 'السفير الماسي للاستقدام',
    nameEn: 'Alsafeer Almassy Recruitment Company',
    crNumber: '1010123456',
    taxNumber: '310123456700003',
    address: 'الرياض - حي الملز - شارع الستين',
    phone: '0114001122',
    email: 'info@saf-rec.sa',
    logoUrl: '/logos/saf.png',
    monogram: 'SAF',
    defaultHideHoldingGroup: false,
    hrDepartmentTitleAr: 'إدارة الموارد البشرية — شركة السفير الماسي للاستقدام',
    hrSignatoryNameAr: 'أ. فهد بن عبدالله القحطاني',
    entityFinanceManagerAr: 'أ. عبدالرحمن بن سعد الدوسري',
    entityFinanceRoleAr: 'مدير الإدارة المالية — السفير الماسي',
    entityGeneralManagerAr: 'أ. نايف بن محمد العتيبي',
    entityGeneralManagerRoleAr: 'المدير العام المفوض — شركة السفير الماسي للاستقدام',
    musanedLicenseNo: 'MSN-38-1010123',
    chamberMembershipNo: 'RCCI-441092',
    gosiRegistrationNo: '509112345',
  },
  YAQ: {
    code: 'YAQ',
    nameAr: 'شركة ياقوت نجد لتشغيل الكوادر والتأجير',
    shortNameAr: 'ياقوت نجد للتشغيل والتأجير',
    nameEn: 'Yaqout Najed Operations & Staffing Company',
    crNumber: '1010234567',
    taxNumber: '310234567800003',
    address: 'جدة - طريق المدينة المنورة',
    phone: '0126002233',
    email: 'contact@yaqoot-ops.sa',
    logoUrl: '/logos/yaqoot.png',
    monogram: 'YAQ',
    defaultHideHoldingGroup: false,
    hrDepartmentTitleAr: 'إدارة الموارد البشرية — شركة ياقوت نجد لتشغيل الكوادر',
    hrSignatoryNameAr: 'أ. منصور بن خالد الغامدي',
    entityFinanceManagerAr: 'أ. طارق بن حسن الزهراني',
    entityFinanceRoleAr: 'مدير الشؤون المالية — ياقوت نجد',
    entityGeneralManagerAr: 'أ. بندر بن عبدالعزيز الحربي',
    entityGeneralManagerRoleAr: 'المدير العام المفوض — شركة ياقوت نجد لتشغيل الكوادر',
    musanedLicenseNo: 'MSN-39-1010234',
    chamberMembershipNo: 'JCCI-552810',
    gosiRegistrationNo: '509223456',
  },
  TOP: {
    code: 'TOP',
    nameAr: 'شركة توباز للاستقدام',
    shortNameAr: 'توباز للاستقدام',
    nameEn: 'Topaz Recruitment Company',
    crNumber: '1010345678',
    taxNumber: '310345678900003',
    address: 'الدمام - شارع الأشرعة',
    phone: '0138003344',
    email: 'recruitment@topaz-rec.sa',
    logoUrl: '/logos/topaz.png',
    monogram: 'TOP',
    defaultHideHoldingGroup: false,
    hrDepartmentTitleAr: 'إدارة الموارد البشرية — شركة توباز للاستقدام',
    hrSignatoryNameAr: 'أ. تركي بن راشد الخالدي',
    entityFinanceManagerAr: 'أ. سلمان بن فهد الهاجري',
    entityFinanceRoleAr: 'مدير الإدارة المالية — شركة توباز',
    entityGeneralManagerAr: 'أ. مشعل بن ناصر الدوسري',
    entityGeneralManagerRoleAr: 'المدير العام المفوض — شركة توباز للاستقدام',
    musanedLicenseNo: 'MSN-40-1010345',
    chamberMembershipNo: 'ECCI-331904',
    gosiRegistrationNo: '509334567',
  },
  DAR: {
    code: 'DAR',
    nameAr: 'دار الرواد لمراكز الإيواء والخدمات اللوجستية',
    shortNameAr: 'دار الرواد للإيواء واللوجستيات',
    nameEn: 'Dar Al-Ruwad Shelter & Logistics Company',
    crNumber: '1010642918',
    taxNumber: '310456789000003',
    address: 'الرياض - حي الرمال - مجمع الإيواء المعتمد',
    phone: '0114889900',
    email: 'shelter@alruwad.sa',
    logoUrl: '/logos/ruwad.png',
    monogram: 'DAR',
    defaultHideHoldingGroup: false,
    hrDepartmentTitleAr: 'إدارة الموارد البشرية — دار الرواد لمراكز الإيواء',
    hrSignatoryNameAr: 'أ. نواف بن سعود الشمري',
    entityFinanceManagerAr: 'أ. وليد بن إبراهيم التميمي',
    entityFinanceRoleAr: 'مدير الشؤون المالية — دار الرواد',
    entityGeneralManagerAr: 'أ. ماجد بن سليمان الرشيد',
    entityGeneralManagerRoleAr: 'المدير العام المفوض — دار الرواد لمراكز الإيواء',
    chamberMembershipNo: 'RCCI-664219',
    gosiRegistrationNo: '509445678',
  },
  KAS: {
    code: 'KAS',
    nameAr: 'شركة كاس للتجارة والمنافسات',
    shortNameAr: 'شركة كاس للتجارة',
    nameEn: 'KAS Trading & Commercial Tenders Company',
    crNumber: '1010789234',
    taxNumber: '310284759200003',
    address: 'الرياض - طريق الملك فهد - مجمع شركة كاس للتجارة',
    phone: '0114995566',
    email: 'info@kas.sa',
    logoUrl: '/logo.png',
    monogram: 'KAS',
    defaultHideHoldingGroup: true,
    hrDepartmentTitleAr: 'إدارة الموارد البشرية والشؤون الإدارية — شركة كاس للتجارة',
    hrSignatoryNameAr: 'أ. عادل بن صالح المطيري',
    entityFinanceManagerAr: 'أ. فيصل بن عبدالكريم السبيعي',
    entityFinanceRoleAr: 'المدير المالي — شركة كاس للتجارة والمنافسات',
    entityGeneralManagerAr: 'م. سلطان بن عبدالرحمن الشهري',
    entityGeneralManagerRoleAr: 'المدير العام — شركة كاس للتجارة والمنافسات',
    chamberMembershipNo: 'RCCI-778923',
    gosiRegistrationNo: '509556789',
  },
  HQ: {
    code: 'HQ',
    nameAr: 'مجموعة خالد السليم التجارية — الإدارة العامة',
    shortNameAr: 'الإدارة العامة للمجموعة',
    nameEn: 'Khalid Al-Sulaim Commercial Group (Head Office)',
    crNumber: '1010892019',
    taxNumber: '310928374100003',
    address: 'الرياض - طريق الملك فهد - البرج الموحد للمجموعة',
    phone: '920001234',
    email: 'group@alsulaim.com.sa',
    logoUrl: '/logos/group-logo.png',
    monogram: 'KS',
    defaultHideHoldingGroup: false,
    hrDepartmentTitleAr: 'الإدارة المركزية للموارد البشرية والشؤون الإدارية',
    hrSignatoryNameAr: 'أ. عبدالملك بن فهد السليم',
    entityFinanceManagerAr: HOLDING_GROUP_INFO.groupCfoNameAr,
    entityFinanceRoleAr: HOLDING_GROUP_INFO.groupCfoRoleAr,
    entityGeneralManagerAr: HOLDING_GROUP_INFO.groupChairmanNameAr,
    entityGeneralManagerRoleAr: HOLDING_GROUP_INFO.groupChairmanRoleAr,
    chamberMembershipNo: 'RCCI-100892',
    gosiRegistrationNo: '509001122',
  },
};

export const ALL_ENTITY_OPTIONS: Array<{ code: CanonicalEntityCode; labelAr: string; crNumber: string }> = [
  { code: 'SAF', labelAr: 'شركة السفير الماسي للاستقدام (SAF)', crNumber: '1010123456' },
  { code: 'YAQ', labelAr: 'شركة ياقوت نجد لتشغيل الكوادر والتأجير (YAQ)', crNumber: '1010234567' },
  { code: 'TOP', labelAr: 'شركة توباز للاستقدام (TOP)', crNumber: '1010345678' },
  { code: 'DAR', labelAr: 'دار الرواد لمراكز الإيواء والخدمات اللوجستية (DAR)', crNumber: '1010642918' },
  { code: 'KAS', labelAr: 'شركة كاس للتجارة والمنافسات (KAS)', crNumber: '1010789234' },
  { code: 'HQ', labelAr: 'الإدارة العامة — المركز الرئيسي (HQ)', crNumber: '1010892019' },
];

const BRANDING_PREFS_STORAGE_KEY = 'ALSULAIM_ENTITY_BRANDING_PREFS_V1';

export interface EntityBrandingPreferencesMap {
  [entityCode: string]: {
    hideHoldingGroupBrand?: boolean;
    customCompanyNameAr?: string;
    customHrSignatory?: string;
    customGeneralManager?: string;
  };
}

export function normalizeCanonicalEntityCode(raw?: unknown): CanonicalEntityCode | null {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;
  const upper = str.toUpperCase();

  if (upper === 'SAF' || upper === 'MASI' || str.includes('السفير الماسي') || str.includes('سواعدنا')) {
    return 'SAF';
  }
  if (upper === 'YAQ' || upper === 'YAQOOT' || str.includes('ياقوت نجد')) {
    return 'YAQ';
  }
  if (upper === 'TOP' || upper === 'TOPAZ' || str.includes('توباز')) {
    return 'TOP';
  }
  if (upper === 'DAR' || upper === 'RUWAD' || str.includes('دار الرواد')) {
    return 'DAR';
  }
  if (upper === 'KAS' || str.includes('شركة كاس')) {
    return 'KAS';
  }
  if (
    upper === 'HQ' ||
    upper === 'ALL' ||
    upper === 'GRP' ||
    upper === 'GROUP' ||
    upper === 'HOLDING' ||
    str.includes('الإدارة العامة') ||
    str.includes('مجموعة خالد السليم') ||
    str.includes('مجموعة السليم')
  ) {
    return 'HQ';
  }
  return null;
}

export function readEntityBrandingPreferences(): EntityBrandingPreferencesMap {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(BRANDING_PREFS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function getEntityHideHoldingPreference(entityCode: string): boolean {
  const code = normalizeCanonicalEntityCode(entityCode) || 'HQ';
  const prefs = readEntityBrandingPreferences();
  if (typeof prefs[code]?.hideHoldingGroupBrand === 'boolean') {
    return Boolean(prefs[code].hideHoldingGroupBrand);
  }
  return ENTITY_LEGAL_PROFILES[code].defaultHideHoldingGroup;
}

export function setEntityHideHoldingPreference(entityCode: string, hide: boolean): void {
  const code = normalizeCanonicalEntityCode(entityCode) || 'HQ';
  try {
    if (typeof localStorage === 'undefined') return;
    const prefs = readEntityBrandingPreferences();
    prefs[code] = {
      ...(prefs[code] || {}),
      hideHoldingGroupBrand: hide,
    };
    localStorage.setItem(BRANDING_PREFS_STORAGE_KEY, JSON.stringify(prefs));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('erp-branding-updated', { detail: { code, hide } }));
    }
  } catch {
    // non-blocking
  }
}

export function detectActiveSessionEntityCode(): CanonicalEntityCode {
  try {
    const storeCompany = useAppStore.getState()?.activeCompanyId;
    const raw =
      typeof localStorage !== 'undefined'
        ? decryptStoragePayload(localStorage.getItem('ALSULAIM_ACTIVE_COMPANY')) ||
          decryptStoragePayload(localStorage.getItem('alsulaim_active_company')) ||
          decryptStoragePayload(localStorage.getItem('ALSULAIM_LOCKED_COMPANY')) ||
          decryptStoragePayload(localStorage.getItem('ALSULAIM_TARGET_SYSTEM')) ||
          storeCompany ||
          ''
        : storeCompany || '';
    return normalizeCanonicalEntityCode(raw) || 'HQ';
  } catch {
    return 'HQ';
  }
}

export function inferEntityCodeFromRecordOrList(input?: unknown): CanonicalEntityCode | null {
  if (!input) return null;
  if (typeof input === 'string') {
    return normalizeCanonicalEntityCode(input);
  }
  if (Array.isArray(input)) {
    if (input.length === 0) return null;
    const codes = new Set<CanonicalEntityCode>();
    for (const row of input) {
      if (row && typeof row === 'object') {
        const r = row as Record<string, unknown>;
        const detected =
          normalizeCanonicalEntityCode(r.company_id) ||
          normalizeCanonicalEntityCode(r.companyId) ||
          normalizeCanonicalEntityCode(r.company_code) ||
          normalizeCanonicalEntityCode(r.companyCode) ||
          normalizeCanonicalEntityCode(r.entity_code) ||
          normalizeCanonicalEntityCode(r.company_name) ||
          normalizeCanonicalEntityCode(r.companyName);
        if (detected) codes.add(detected);
      }
    }
    if (codes.size === 1) {
      return Array.from(codes)[0];
    }
    return null;
  }
  if (typeof input === 'object') {
    const r = input as Record<string, unknown>;
    return (
      normalizeCanonicalEntityCode(r.company_id) ||
      normalizeCanonicalEntityCode(r.companyId) ||
      normalizeCanonicalEntityCode(r.company_code) ||
      normalizeCanonicalEntityCode(r.companyCode) ||
      normalizeCanonicalEntityCode(r.entity_code) ||
      normalizeCanonicalEntityCode(r.company_name) ||
      normalizeCanonicalEntityCode(r.companyName)
    );
  }
  return null;
}

export interface DocumentBrandingOptions {
  entityCode?: string;
  hideHoldingGroupBrand?: boolean;
  customCompanyNameAr?: string;
  customFinanceSignatory?: string;
  customExecutiveSignatory?: string;
}

export interface ResolvedDocumentBranding {
  entity: EntityLegalProfile;
  code: CanonicalEntityCode;
  displayNameAr: string;
  displayNameEn: string;
  crNumber: string;
  taxNumber: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  monogram: string;
  hideHoldingGroupBrand: boolean;
  holdingBadgeAr: string;
  letterheadSovereignLineAr: string;
  footerOrganizationLineAr: string;
  systemPlatformTitleAr: string;
  hrIssuerTitleAr: string;
  hrSignatoryNameAr: string;
  financeSignatoryNameAr: string;
  financeSignatoryRoleAr: string;
  executiveSignatoryNameAr: string;
  executiveSignatoryRoleAr: string;
  executiveApprovalBadgeAr: string;
  qrVerifyNamespace: string;
}

export function resolveDocumentBranding(
  targetRecordOrCode?: unknown,
  options?: DocumentBrandingOptions
): ResolvedDocumentBranding {
  const explicitCode = normalizeCanonicalEntityCode(options?.entityCode);
  const recordCode = inferEntityCodeFromRecordOrList(targetRecordOrCode);
  const sessionCode = detectActiveSessionEntityCode();

  const resolvedCode: CanonicalEntityCode = explicitCode || recordCode || sessionCode || 'HQ';
  const baseProfile = ENTITY_LEGAL_PROFILES[resolvedCode] || ENTITY_LEGAL_PROFILES.HQ;

  // Sync latest fields from COMPANIES_LIST if present
  const ctxMatch = COMPANIES_LIST.find(
    (c) => c.code.toUpperCase() === resolvedCode || c.id.toUpperCase() === resolvedCode
  );

  const entity: EntityLegalProfile = ctxMatch
    ? {
        ...baseProfile,
        nameAr: ctxMatch.name || baseProfile.nameAr,
        crNumber: ctxMatch.crNumber || baseProfile.crNumber,
        taxNumber: ctxMatch.taxNumber || baseProfile.taxNumber,
        address: ctxMatch.address || baseProfile.address,
        phone: ctxMatch.phone || baseProfile.phone,
        email: ctxMatch.email || baseProfile.email,
        logoUrl: ctxMatch.logo || baseProfile.logoUrl,
      }
    : baseProfile;

  const effectiveHideGroup =
    typeof options?.hideHoldingGroupBrand === 'boolean'
      ? options.hideHoldingGroupBrand
      : getEntityHideHoldingPreference(resolvedCode);

  // If HQ is selected AND user explicitly hides the holding group phrase, show neutral Head Office name
  const displayNameAr =
    options?.customCompanyNameAr?.trim() ||
    (resolvedCode === 'HQ' && effectiveHideGroup
      ? 'الإدارة العامة للعمليات والموارد البشرية'
      : entity.nameAr);

  const displayNameEn =
    resolvedCode === 'HQ' && effectiveHideGroup
      ? 'General Administration & Corporate Operations'
      : entity.nameEn;

  const useStandaloneSignatories = effectiveHideGroup && resolvedCode !== 'HQ';

  const financeSignatoryNameAr =
    options?.customFinanceSignatory?.trim() ||
    (effectiveHideGroup
      ? useStandaloneSignatories
        ? entity.entityFinanceManagerAr
        : 'مدير الإدارة المالية المعتمد'
      : HOLDING_GROUP_INFO.groupCfoNameAr);

  const financeSignatoryRoleAr = effectiveHideGroup
    ? useStandaloneSignatories
      ? entity.entityFinanceRoleAr
      : 'الإدارة المالية والمراجعة'
    : HOLDING_GROUP_INFO.groupCfoRoleAr;

  const executiveSignatoryNameAr =
    options?.customExecutiveSignatory?.trim() ||
    (effectiveHideGroup
      ? useStandaloneSignatories
        ? entity.entityGeneralManagerAr
        : 'المدير التنفيذي المفوض'
      : HOLDING_GROUP_INFO.groupChairmanNameAr);

  const executiveSignatoryRoleAr = effectiveHideGroup
    ? useStandaloneSignatories
      ? entity.entityGeneralManagerRoleAr
      : `الإدارة التنفيذية — ${displayNameAr}`
    : HOLDING_GROUP_INFO.groupChairmanRoleAr;

  const executiveApprovalBadgeAr = effectiveHideGroup
    ? `✓ اعتماد ${executiveSignatoryNameAr}`
    : `✓ اعتماد ${HOLDING_GROUP_INFO.groupChairmanNameAr}`;

  return {
    entity,
    code: resolvedCode,
    displayNameAr,
    displayNameEn,
    crNumber: entity.crNumber,
    taxNumber: entity.taxNumber,
    address: entity.address,
    phone: entity.phone,
    email: entity.email,
    logoUrl: entity.logoUrl,
    monogram: resolvedCode === 'HQ' && effectiveHideGroup ? 'ERP' : entity.monogram,
    hideHoldingGroupBrand: effectiveHideGroup,
    holdingBadgeAr: effectiveHideGroup ? '' : `${HOLDING_GROUP_INFO.nameAr} • الإدارة العامة`,
    letterheadSovereignLineAr: effectiveHideGroup
      ? 'المملكة العربية السعودية'
      : `المملكة العربية السعودية • ${HOLDING_GROUP_INFO.holdingTitleAr}`,
    footerOrganizationLineAr: effectiveHideGroup
      ? displayNameAr
      : `${HOLDING_GROUP_INFO.nameAr} • ${displayNameAr}`,
    systemPlatformTitleAr: effectiveHideGroup
      ? `منظومة الموارد المؤسسية المعتمدة — ${displayNameAr}`
      : 'نظام مجموعة شركات خالد السليم الموحد',
    hrIssuerTitleAr: effectiveHideGroup
      ? entity.hrDepartmentTitleAr.replace(/مجموعة خالد السليم[^—-]*/g, '').trim()
      : entity.hrDepartmentTitleAr,
    hrSignatoryNameAr: entity.hrSignatoryNameAr,
    financeSignatoryNameAr,
    financeSignatoryRoleAr,
    executiveSignatoryNameAr,
    executiveSignatoryRoleAr,
    executiveApprovalBadgeAr,
    qrVerifyNamespace: `${resolvedCode}-VERIFY`,
  };
}
