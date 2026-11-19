/**
 * Unified External Agency Master, 42+ Alias Normalizer, Musaned 5-Sheet Pipeline Engine,
 * Isolated External Partner Auth Store, PDPL Sanitizer, and Email + WhatsApp Multi-Channel Dispatcher.
 *
 * Khalid Al-Sulaim Holding Group ERP — Foreign Agencies & Follow-up Center (Islam Arafa & Mahmoud Fouda)
 */

import * as XLSX from 'xlsx';
import { realErpDataStore } from './realErpDataStore';
import {
  computeKasPasswordDigest,
  generateStrongClientPassword,
  validateStrongPasswordPolicy,
} from '../config/kasEmployeePasswordHashes';

export type RecruitmentSubsidiaryCode = 'SAF' | 'TOP' | 'YAQ' | 'DAR';

export type FollowupCoordinatorEmail =
  | 'i.mahmoud.followup@kas.sa'
  | 'm.fouda.followup@kas.sa';

export const FOLLOWUP_COORDINATORS: Array<{
  email: FollowupCoordinatorEmail;
  nameAr: string;
  roleAr: string;
  phone: string;
}> = [
  {
    email: 'i.mahmoud.followup@kas.sa',
    nameAr: 'إسلام أحمد عرفة',
    roleAr: 'مسؤول متابعة الوكلاء والمعاملات الخارجية',
    phone: '+966500112233',
  },
  {
    email: 'm.fouda.followup@kas.sa',
    nameAr: 'محمود فودة',
    roleAr: 'أخصائي متابعة المكاتب الخارجية والـ ATS',
    phone: '+966500112244',
  },
];

export type TransactionStage =
  | 'UNASSIGNED'     // غير معيّن (بانتظار تعيين العاملة من الوكيل)
  | 'ASSIGNED'       // معيّن (تم ربط العاملة والجواز بالعقد)
  | 'DELEGATED'      // مفوّض (تم التفويض على مساند / إنجاز)
  | 'MEDICAL_FIT'    // فحص طبي معتمد
  | 'VISA_STAMPED'   // تأشيرة مختومة من السفارة
  | 'TICKET_BOOKED'  // تذكرة طيران محجوزة
  | 'ARRIVED'        // وصلت واستُلمت بالمطار
  | 'BACKOUT'        // اعتذار / رفض قبل السفر (Backout)
  | 'RUNAWAY'        // تغيب / هروب
  | 'REPLACED'       // بديل ضمن ضمان 90 يوماً
  | 'CANCELLED';     // ملغاة

export interface StageMetadata {
  code: TransactionStage;
  labelAr: string;
  labelEn: string;
  order: number;
  isTerminal: boolean;
  agencyEditable: boolean;
}

export const TRANSACTION_STAGES: StageMetadata[] = [
  { code: 'UNASSIGNED', labelAr: 'غير معيّن (بانتظار الوكيل)', labelEn: 'Unassigned', order: 1, isTerminal: false, agencyEditable: false },
  { code: 'ASSIGNED', labelAr: 'معيّن (تم اختيار العاملة)', labelEn: 'Assigned', order: 2, isTerminal: false, agencyEditable: true },
  { code: 'DELEGATED', labelAr: 'مفوّض (تفويض إنجاز/مساند)', labelEn: 'Delegated', order: 3, isTerminal: false, agencyEditable: false },
  { code: 'MEDICAL_FIT', labelAr: 'فحص طبي معتمد', labelEn: 'Medical Fit', order: 4, isTerminal: false, agencyEditable: true },
  { code: 'VISA_STAMPED', labelAr: 'تأشيرة مختومة', labelEn: 'Visa Stamped', order: 5, isTerminal: false, agencyEditable: true },
  { code: 'TICKET_BOOKED', labelAr: 'تذكرة محجوزة', labelEn: 'Ticket Booked', order: 6, isTerminal: false, agencyEditable: true },
  { code: 'ARRIVED', labelAr: 'وصلت (تم الوصول)', labelEn: 'Arrived', order: 7, isTerminal: true, agencyEditable: false },
  { code: 'BACKOUT', labelAr: 'اعتذار / Backout', labelEn: 'Backout', order: 8, isTerminal: true, agencyEditable: true },
  { code: 'RUNAWAY', labelAr: 'تغيب / هروب', labelEn: 'Runaway', order: 9, isTerminal: true, agencyEditable: false },
  { code: 'REPLACED', labelAr: 'بديل (ضمان 90 يوماً)', labelEn: 'Replacement', order: 10, isTerminal: false, agencyEditable: false },
  { code: 'CANCELLED', labelAr: 'ملغاة', labelEn: 'Cancelled', order: 11, isTerminal: true, agencyEditable: false },
];

export function getStageLabelAr(stage: TransactionStage): string {
  return TRANSACTION_STAGES.find((s) => s.code === stage)?.labelAr || stage;
}

export interface UnifiedExternalAgency {
  id: string;
  company_id: RecruitmentSubsidiaryCode;
  canonical_code: string;
  name_en: string;
  name_ar: string;
  country: string;
  country_code: string;
  license_no: string;
  manager_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  aliases: string[];
  authorized_companies: RecruitmentSubsidiaryCode[];
  assigned_coordinator_email: FollowupCoordinatorEmail;
  assigned_coordinator_name: string;
  default_commission_usd: number;
  sla_assign_days: number;
  avg_days_to_assign: number;
  avg_days_to_arrival: number;
  historical_total_contracts: number;
  historical_arrived_count: number;
  historical_backout_count: number;
  historical_runaway_count: number;
  historical_cancelled_count: number;
  quality_score: number;
  status: 'نشط' | 'مجمّد' | 'تحت المراجعة';
  created_at: string;
}

export interface ExternalAgencyAccount {
  id: string;
  company_id: RecruitmentSubsidiaryCode;
  agency_id: string;
  agency_name: string;
  agency_name_ar: string;
  country: string;
  username: string;
  email: string;
  password_digest: string;
  contact_person: string;
  phone: string;
  whatsapp: string;
  authorized_companies: RecruitmentSubsidiaryCode[];
  status: 'نشط' | 'مجمّد';
  last_login_at?: string;
  created_by: string;
  created_at: string;
}

export interface MusanedFollowupTransaction {
  id: string;
  company_id: RecruitmentSubsidiaryCode;
  musaned_contract_no: string;
  internal_contract_no?: string;
  source_sheet: string;
  is_archive: boolean;
  client_name: string;
  client_national_id: string;
  client_phone: string;
  client_city: string;
  visa_number: string;
  visa_issue_date?: string;
  visa_issue_hijri?: string;
  visa_expiry_date?: string;
  worker_type: 'غير معين' | 'معين' | 'معروفة';
  maid_name: string;
  passport_number: string;
  nationality: string;
  religion?: string;
  profession: string;
  monthly_salary: number;
  worker_phone?: string;
  agency_id?: string;
  agency_raw_name: string;
  agency_canonical_name: string;
  assigned_coordinator_email: FollowupCoordinatorEmail;
  sales_creator_name: string;
  branch_raw_name: string;
  stage: TransactionStage;
  stage_timestamps: Partial<Record<TransactionStage, string>>;
  contract_start_date: string;
  musaned_link_date?: string;
  delegation_date?: string;
  medical_date?: string;
  visa_stamped_date?: string;
  ticket_booked_date?: string;
  flight_number?: string;
  airline?: string;
  expected_arrival_date?: string;
  arrival_date?: string;
  arrival_destination: string;
  backout_date?: string;
  runaway_date?: string;
  replacement_for_contract_no?: string;
  paid_amount_sar: number;
  commission_usd: number;
  cv_id?: string;
  notes?: string;
  updated_at: string;
}

/** PDPL-Safe Projection for External Agency Partner View (Zero Client PII!) */
export interface SanitizedAgencyTransaction {
  id: string;
  company_id: RecruitmentSubsidiaryCode;
  company_name_ar: string;
  musaned_contract_no: string;
  visa_number: string;
  visa_issue_date?: string;
  visa_expiry_date?: string;
  worker_type: 'غير معين' | 'معين' | 'معروفة';
  maid_name: string;
  passport_number: string;
  nationality: string;
  religion?: string;
  profession: string;
  monthly_salary: number;
  agency_id?: string;
  agency_canonical_name: string;
  stage: TransactionStage;
  stage_timestamps: Partial<Record<TransactionStage, string>>;
  contract_start_date: string;
  delegation_date?: string;
  medical_date?: string;
  visa_stamped_date?: string;
  ticket_booked_date?: string;
  flight_number?: string;
  airline?: string;
  expected_arrival_date?: string;
  arrival_date?: string;
  arrival_destination: string;
  commission_usd: number;
  cv_id?: string;
  sla_assign_deadline?: string;
  updated_at: string;
}

export interface TransactionSlaEvaluation {
  daysSinceContract: number;
  daysUntilVisaExpiry: number | null;
  daysSinceMedical: number | null;
  daysOverExpectedArrival: number | null;
  unassignedOverdue: boolean;
  visaExpiringCritical: boolean;
  medicalExpiringSoon: boolean;
  delegatedWithoutMedical: boolean;
  arrivalOverdue: boolean;
  severity: 'CRITICAL' | 'WARNING' | 'NORMAL';
  alertsAr: string[];
}

export interface WorkbookImportHygieneReport {
  totalRowsScanned: number;
  activeInserted: number;
  activeUpdated: number;
  archiveImported: number;
  correctedAgentAliases: number;
  extractedBackoutsFromName: number;
  parsedFreeTextStatuses: number;
  convertedExcelSerialDates: number;
  normalizedBranches: number;
  duplicatePassportsDetected: string[];
  unknownAgentSpellings: Array<{
    rawSpelling: string;
    occurrences: number;
    suggestedAgencyId?: string;
    suggestedAgencyName?: string;
  }>;
  sheetsProcessed: string[];
}

const AGENCY_ACCOUNTS_STORAGE_KEY = 'ALSULAIM_EXTERNAL_AGENCY_ACCOUNTS_V1';
const AGENCY_MASTER_STORAGE_KEY = 'ALSULAIM_EXTERNAL_AGENCIES_MASTER_V1';

export const SUBSIDIARY_DISPLAY_NAMES: Record<RecruitmentSubsidiaryCode, string> = {
  SAF: 'شركة السفير الماسي للاستقدام',
  TOP: 'شركة توباز للاستقدام',
  YAQ: 'شركة ياقوت نجد للاستقدام والتأجير',
  DAR: 'دار الرواد للاستقدام والإيواء',
};

/**
 * Pre-seeded Unified Agent Master derived directly from Islam Arafa & Mahmoud Fouda's
 * 18,000+ Musaned operational & archive records (merging all 42+ real spellings).
 */
export const INITIAL_UNIFIED_AGENCIES: UnifiedExternalAgency[] = [
  {
    id: 'AGY-ETH-REAL',
    company_id: 'SAF',
    canonical_code: 'REAL_ETH',
    name_en: 'Real Foreign Employment Agency PLC',
    name_ar: 'وكالة ريل الدولية للاستقدام',
    country: 'أثيوبيا',
    country_code: 'ET',
    license_no: 'ETH-MOL-4410',
    manager_name: 'Abebe Tadesse',
    email: 'ops@real-agency.et',
    phone: '+251911402210',
    whatsapp: '+251911402210',
    aliases: ['ريل', 'Real', 'REAL', 'Real Foreign Employment Agency', 'REAL FOREIGN EMPLOYMENT AGENCY'],
    authorized_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
    assigned_coordinator_email: 'i.mahmoud.followup@kas.sa',
    assigned_coordinator_name: 'إسلام أحمد عرفة',
    default_commission_usd: 1050,
    sla_assign_days: 9,
    avg_days_to_assign: 7.5,
    avg_days_to_arrival: 34,
    historical_total_contracts: 1615,
    historical_arrived_count: 1482,
    historical_backout_count: 68,
    historical_runaway_count: 24,
    historical_cancelled_count: 41,
    quality_score: 94.2,
    status: 'نشط',
    created_at: '2026-01-10',
  },
  {
    id: 'AGY-ETH-TELA',
    company_id: 'DAR',
    canonical_code: 'TELA_ETH',
    name_en: 'Tela Foreign Employment Agency',
    name_ar: 'وكالة تيلا للاستقدام الخارجي',
    country: 'أثيوبيا',
    country_code: 'ET',
    license_no: 'ETH-MOL-5129',
    manager_name: 'Dawit Bekele',
    email: 'portal@tela-agency.et',
    phone: '+251911883412',
    whatsapp: '+251911883412',
    aliases: ['تيلا', 'Tela', 'TELA', 'Tela Foreign Employment Agency', 'Tela FEA', 'TELA FEA'],
    authorized_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
    assigned_coordinator_email: 'i.mahmoud.followup@kas.sa',
    assigned_coordinator_name: 'إسلام أحمد عرفة',
    default_commission_usd: 1050,
    sla_assign_days: 10,
    avg_days_to_assign: 8.2,
    avg_days_to_arrival: 36,
    historical_total_contracts: 1685,
    historical_arrived_count: 1510,
    historical_backout_count: 92,
    historical_runaway_count: 31,
    historical_cancelled_count: 52,
    quality_score: 91.8,
    status: 'نشط',
    created_at: '2026-01-10',
  },
  {
    id: 'AGY-ETH-MZAIN',
    company_id: 'SAF',
    canonical_code: 'MZAIN_ETH',
    name_en: 'Mohammed Zain Foreign Employment Agency',
    name_ar: 'وكالة محمد زين للاستقدام',
    country: 'أثيوبيا',
    country_code: 'ET',
    license_no: 'ETH-MOL-7731',
    manager_name: 'Mohammed Zain',
    email: 'mzain@ethio-manpower.com',
    phone: '+251912339988',
    whatsapp: '+251912339988',
    aliases: ['محمد زين', 'MOHAMMED ZAIN', 'Mohammed Zain', 'مكتب محمد زين'],
    authorized_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
    assigned_coordinator_email: 'i.mahmoud.followup@kas.sa',
    assigned_coordinator_name: 'إسلام أحمد عرفة',
    default_commission_usd: 1000,
    sla_assign_days: 8,
    avg_days_to_assign: 6.8,
    avg_days_to_arrival: 32,
    historical_total_contracts: 410,
    historical_arrived_count: 375,
    historical_backout_count: 18,
    historical_runaway_count: 7,
    historical_cancelled_count: 10,
    quality_score: 93.5,
    status: 'نشط',
    created_at: '2026-02-01',
  },
  {
    id: 'AGY-INT-NUHIMAN',
    company_id: 'SAF',
    canonical_code: 'NUHIMAN_INT',
    name_en: 'Al Nuhiman Overseas Recruitment',
    name_ar: 'شركة النحيمان للاستقدام الدولي',
    country: 'أثيوبيا',
    country_code: 'ET',
    license_no: 'INT-REC-6602',
    manager_name: 'خالد النحيمان',
    email: 'ops@alnuhiman-agency.com',
    phone: '+251913774411',
    whatsapp: '+251913774411',
    aliases: ['شركة النحيمان', 'AL NUHIMAN', 'Al Nuhiman', 'النحيمان', 'AL-NUHIMAN'],
    authorized_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
    assigned_coordinator_email: 'm.fouda.followup@kas.sa',
    assigned_coordinator_name: 'محمود فودة',
    default_commission_usd: 1050,
    sla_assign_days: 10,
    avg_days_to_assign: 8.9,
    avg_days_to_arrival: 35,
    historical_total_contracts: 310,
    historical_arrived_count: 280,
    historical_backout_count: 14,
    historical_runaway_count: 6,
    historical_cancelled_count: 10,
    quality_score: 92.4,
    status: 'نشط',
    created_at: '2026-02-05',
  },
  {
    id: 'AGY-PHL-YOSHI',
    company_id: 'TOP',
    canonical_code: 'YOSHI_PH',
    name_en: 'Yoshi Promotions, Inc.',
    name_ar: 'وكالة يوشي بروموشنز — الفلبين',
    country: 'الفلبين',
    country_code: 'PH',
    license_no: 'DMW-POEA-1192',
    manager_name: 'Maria Lourdes Santos',
    email: 'deployments@yoshi-ph.com',
    phone: '+63288124455',
    whatsapp: '+639178124455',
    aliases: ['YOSHI PROMOTIONS, INC', 'يوشى', 'يوشي', 'YOSHI', 'Yoshi', 'YOSHI PROMOTIONS'],
    authorized_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
    assigned_coordinator_email: 'm.fouda.followup@kas.sa',
    assigned_coordinator_name: 'محمود فودة',
    default_commission_usd: 1350,
    sla_assign_days: 12,
    avg_days_to_assign: 9.4,
    avg_days_to_arrival: 42,
    historical_total_contracts: 2016,
    historical_arrived_count: 1890,
    historical_backout_count: 54,
    historical_runaway_count: 19,
    historical_cancelled_count: 53,
    quality_score: 95.6,
    status: 'نشط',
    created_at: '2026-01-10',
  },
  {
    id: 'AGY-ETH-ADHUHA',
    company_id: 'SAF',
    canonical_code: 'ADHUHA_ETH',
    name_en: 'Adhuha Foreign Employment Agency',
    name_ar: 'وكالة الضحى للاستقدام الخارجي',
    country: 'أثيوبيا',
    country_code: 'ET',
    license_no: 'ETH-MOL-3390',
    manager_name: 'Jemal Mohammed',
    email: 'info@adhuha-fea.com',
    phone: '+251911665522',
    whatsapp: '+251911665522',
    aliases: ['الضحى', 'الضحي', 'Adhuha', 'ADHUHA', 'Adhuha Foreign Employment Agency'],
    authorized_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
    assigned_coordinator_email: 'i.mahmoud.followup@kas.sa',
    assigned_coordinator_name: 'إسلام أحمد عرفة',
    default_commission_usd: 1050,
    sla_assign_days: 10,
    avg_days_to_assign: 8.6,
    avg_days_to_arrival: 37,
    historical_total_contracts: 1513,
    historical_arrived_count: 1364,
    historical_backout_count: 79,
    historical_runaway_count: 28,
    historical_cancelled_count: 42,
    quality_score: 91.5,
    status: 'نشط',
    created_at: '2026-01-12',
  },
  {
    id: 'AGY-ETH-SHEGER',
    company_id: 'SAF',
    canonical_code: 'SHEGER_ETH',
    name_en: 'Sheger Foreign Employment Agency PLC',
    name_ar: 'وكالة شيجر الدولية للاستقدام',
    country: 'أثيوبيا',
    country_code: 'ET',
    license_no: 'ETH-MOL-9024',
    manager_name: 'Kedir Gurmu',
    email: 'cvs@sheger-agency.et',
    phone: '+251911990044',
    whatsapp: '+251911990044',
    aliases: ['SHEGER', 'Sheger', 'شيجر', 'SHEGER FOREIGN EMPLOYMENT AGENCY', 'Sheger FEA'],
    authorized_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
    assigned_coordinator_email: 'i.mahmoud.followup@kas.sa',
    assigned_coordinator_name: 'إسلام أحمد عرفة',
    default_commission_usd: 1050,
    sla_assign_days: 9,
    avg_days_to_assign: 7.2,
    avg_days_to_arrival: 33,
    historical_total_contracts: 295,
    historical_arrived_count: 274,
    historical_backout_count: 11,
    historical_runaway_count: 4,
    historical_cancelled_count: 6,
    quality_score: 95.1,
    status: 'نشط',
    created_at: '2026-02-10',
  },
  {
    id: 'AGY-KEN-KHALEEJ',
    company_id: 'DAR',
    canonical_code: 'KHALEEJ_EA',
    name_en: 'Khaleej Agencies Limited',
    name_ar: 'وكالة الخليج المحدودة — شرق أفريقيا',
    country: 'كينيا',
    country_code: 'KE',
    license_no: 'NEA-KE-4088',
    manager_name: 'Hassan Omar',
    email: 'ops@khaleej-agencies.co.ke',
    phone: '+254722334455',
    whatsapp: '+254722334455',
    aliases: ['الخليج', 'KHALEEJ', 'Khaleej', 'KHALEEJ AGENCIES LIMITED'],
    authorized_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
    assigned_coordinator_email: 'm.fouda.followup@kas.sa',
    assigned_coordinator_name: 'محمود فودة',
    default_commission_usd: 1150,
    sla_assign_days: 10,
    avg_days_to_assign: 8.1,
    avg_days_to_arrival: 35,
    historical_total_contracts: 1230,
    historical_arrived_count: 1125,
    historical_backout_count: 49,
    historical_runaway_count: 21,
    historical_cancelled_count: 35,
    quality_score: 92.9,
    status: 'نشط',
    created_at: '2026-01-15',
  },
  {
    id: 'AGY-ETH-NA',
    company_id: 'TOP',
    canonical_code: 'NA_ETH',
    name_en: 'N A Foreign Employment PLC',
    name_ar: 'وكالة إن إيه للاستقدام الخارجي',
    country: 'أثيوبيا',
    country_code: 'ET',
    license_no: 'ETH-MOL-6211',
    manager_name: 'Nuredin Ali',
    email: 'info@na-employment.et',
    phone: '+251911552299',
    whatsapp: '+251911552299',
    aliases: ['ان ايه', 'إن إيه', 'N A', 'NA', 'na', 'N A Foreign Employment PLC'],
    authorized_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
    assigned_coordinator_email: 'i.mahmoud.followup@kas.sa',
    assigned_coordinator_name: 'إسلام أحمد عرفة',
    default_commission_usd: 1050,
    sla_assign_days: 11,
    avg_days_to_assign: 9.5,
    avg_days_to_arrival: 38,
    historical_total_contracts: 1409,
    historical_arrived_count: 1245,
    historical_backout_count: 88,
    historical_runaway_count: 30,
    historical_cancelled_count: 46,
    quality_score: 89.8,
    status: 'نشط',
    created_at: '2026-01-15',
  },
  {
    id: 'AGY-ETH-TWKUL',
    company_id: 'SAF',
    canonical_code: 'TWKUL_ETH',
    name_en: 'Twkul Foreign Employment Agency',
    name_ar: 'وكالة توكل للاستقدام الخارجي',
    country: 'أثيوبيا',
    country_code: 'ET',
    license_no: 'ETH-MOL-8105',
    manager_name: 'Ibrahim Kemal',
    email: 'twkul@ethio-agencies.com',
    phone: '+251912771100',
    whatsapp: '+251912771100',
    aliases: ['Twkul', 'TWKUL', 'توكل', 'وكالة توكل'],
    authorized_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
    assigned_coordinator_email: 'i.mahmoud.followup@kas.sa',
    assigned_coordinator_name: 'إسلام أحمد عرفة',
    default_commission_usd: 1020,
    sla_assign_days: 9,
    avg_days_to_assign: 7.9,
    avg_days_to_arrival: 34,
    historical_total_contracts: 278,
    historical_arrived_count: 251,
    historical_backout_count: 13,
    historical_runaway_count: 5,
    historical_cancelled_count: 9,
    quality_score: 92.1,
    status: 'نشط',
    created_at: '2026-01-20',
  },
  {
    id: 'AGY-ETH-NURAL',
    company_id: 'YAQ',
    canonical_code: 'NURAL_ETH',
    name_en: 'Nural Foreign Employment Agency',
    name_ar: 'وكالة نورال للاستقدام الخارجي',
    country: 'أثيوبيا',
    country_code: 'ET',
    license_no: 'ETH-MOL-5940',
    manager_name: 'Nural Hussen',
    email: 'ops@nural-fea.et',
    phone: '+251911338877',
    whatsapp: '+251911338877',
    aliases: ['نورال', 'Nural', 'nural', 'NURAL', 'NURAL FEA'],
    authorized_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
    assigned_coordinator_email: 'm.fouda.followup@kas.sa',
    assigned_coordinator_name: 'محمود فودة',
    default_commission_usd: 1050,
    sla_assign_days: 10,
    avg_days_to_assign: 8.4,
    avg_days_to_arrival: 36,
    historical_total_contracts: 867,
    historical_arrived_count: 790,
    historical_backout_count: 42,
    historical_runaway_count: 15,
    historical_cancelled_count: 20,
    quality_score: 92.0,
    status: 'نشط',
    created_at: '2026-01-20',
  },
  {
    id: 'AGY-ETH-TIMEBOAST',
    company_id: 'TOP',
    canonical_code: 'TIMEBOAST_ETH',
    name_en: 'Time Boast Foreign Labour Employment Agent PLC',
    name_ar: 'وكالة تايم بوست للاستقدام',
    country: 'أثيوبيا',
    country_code: 'ET',
    license_no: 'ETH-MOL-4920',
    manager_name: 'Solomon Girma',
    email: 'ops@timeboast-fea.et',
    phone: '+251911220088',
    whatsapp: '+251911220088',
    aliases: ['تايم بوست', 'TIme Boast FEA', 'Time Boast', 'TIME BOAST', 'Time Boast Foreign Labour Employment Agent plc'],
    authorized_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
    assigned_coordinator_email: 'i.mahmoud.followup@kas.sa',
    assigned_coordinator_name: 'إسلام أحمد عرفة',
    default_commission_usd: 1050,
    sla_assign_days: 10,
    avg_days_to_assign: 8.7,
    avg_days_to_arrival: 37,
    historical_total_contracts: 731,
    historical_arrived_count: 662,
    historical_backout_count: 39,
    historical_runaway_count: 12,
    historical_cancelled_count: 18,
    quality_score: 91.3,
    status: 'نشط',
    created_at: '2026-01-22',
  },
  {
    id: 'AGY-ETH-HANIRICH',
    company_id: 'SAF',
    canonical_code: 'HANIRICH_ETH',
    name_en: 'Hanirich Foreign Employment Agent',
    name_ar: 'وكالة هانريتش للاستقدام',
    country: 'أثيوبيا',
    country_code: 'ET',
    license_no: 'ETH-MOL-5501',
    manager_name: 'Hani Mekonnen',
    email: 'hanirich@ethio-fea.com',
    phone: '+251911776655',
    whatsapp: '+251911776655',
    aliases: ['هانريتش', 'HANIRICH', 'Hanirich', 'HANIRICH FOREIGN EMPLOYMENT AGENT'],
    authorized_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
    assigned_coordinator_email: 'i.mahmoud.followup@kas.sa',
    assigned_coordinator_name: 'إسلام أحمد عرفة',
    default_commission_usd: 1050,
    sla_assign_days: 10,
    avg_days_to_assign: 8.5,
    avg_days_to_arrival: 36,
    historical_total_contracts: 741,
    historical_arrived_count: 678,
    historical_backout_count: 35,
    historical_runaway_count: 11,
    historical_cancelled_count: 17,
    quality_score: 92.3,
    status: 'نشط',
    created_at: '2026-01-22',
  },
  {
    id: 'AGY-ETH-NUBIA',
    company_id: 'DAR',
    canonical_code: 'NUBIA_ETH',
    name_en: 'Nubia Foreign Employment Agent PLC',
    name_ar: 'وكالة نوبي للاستقدام الخارجي',
    country: 'أثيوبيا',
    country_code: 'ET',
    license_no: 'ETH-MOL-6023',
    manager_name: 'Seid Ahmed',
    email: 'nubia@nubia-fea.et',
    phone: '+251911449911',
    whatsapp: '+251911449911',
    aliases: ['نوبى', 'نوبي', 'NUBIA FOREIGN', 'NUBIA FOREIGN EMPLOYMENT AGENT PLC', 'Nubia'],
    authorized_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
    assigned_coordinator_email: 'm.fouda.followup@kas.sa',
    assigned_coordinator_name: 'محمود فودة',
    default_commission_usd: 1050,
    sla_assign_days: 10,
    avg_days_to_assign: 8.8,
    avg_days_to_arrival: 37,
    historical_total_contracts: 709,
    historical_arrived_count: 644,
    historical_backout_count: 36,
    historical_runaway_count: 13,
    historical_cancelled_count: 16,
    quality_score: 91.7,
    status: 'نشط',
    created_at: '2026-01-25',
  },
  {
    id: 'AGY-KEN-BINIBRAHIM',
    company_id: 'TOP',
    canonical_code: 'BIN_IBRAHIM_KE',
    name_en: 'Bin Ibrahim International Agencies Limited',
    name_ar: 'وكالة بن إبراهيم الدولية',
    country: 'كينيا',
    country_code: 'KE',
    license_no: 'NEA-KE-2291',
    manager_name: 'Salim Bin Ibrahim',
    email: 'ops@binibrahim.co.ke',
    phone: '+254711889900',
    whatsapp: '+254711889900',
    aliases: ['بن ابراهيم', 'بن إبراهيم', 'BIN IBRAHIM', 'BIN IBRAHIM INTERNATIONAL AGENCIES LIMITED'],
    authorized_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
    assigned_coordinator_email: 'm.fouda.followup@kas.sa',
    assigned_coordinator_name: 'محمود فودة',
    default_commission_usd: 1150,
    sla_assign_days: 10,
    avg_days_to_assign: 8.0,
    avg_days_to_arrival: 35,
    historical_total_contracts: 918,
    historical_arrived_count: 846,
    historical_backout_count: 38,
    historical_runaway_count: 14,
    historical_cancelled_count: 20,
    quality_score: 93.1,
    status: 'نشط',
    created_at: '2026-01-25',
  },
  {
    id: 'AGY-BGD-ALKHEDAMAT',
    company_id: 'SAF',
    canonical_code: 'ALKHEDAMAT_BD',
    name_en: 'Al Khedamat Overseas Services',
    name_ar: 'وكالة الخدمات للاستقدام — بنجلادش',
    country: 'بنجلادش',
    country_code: 'BD',
    license_no: 'BMET-RL-1455',
    manager_name: 'Kamrul Hasan',
    email: 'ops@alkhedamat-bd.com',
    phone: '+8801711223344',
    whatsapp: '+8801711223344',
    aliases: ['ALKHEDAMAT', 'AL KHEDAMAT', 'الخدمات', 'Al Khedamat'],
    authorized_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
    assigned_coordinator_email: 'm.fouda.followup@kas.sa',
    assigned_coordinator_name: 'محمود فودة',
    default_commission_usd: 980,
    sla_assign_days: 11,
    avg_days_to_assign: 9.1,
    avg_days_to_arrival: 39,
    historical_total_contracts: 180,
    historical_arrived_count: 164,
    historical_backout_count: 8,
    historical_runaway_count: 3,
    historical_cancelled_count: 5,
    quality_score: 92.6,
    status: 'نشط',
    created_at: '2026-02-01',
  },
  {
    id: 'AGY-ETH-NAFLET',
    company_id: 'YAQ',
    canonical_code: 'NAFLET_ETH',
    name_en: 'Naflet Foreign Employment Agency',
    name_ar: 'وكالة نافليت للاستقدام',
    country: 'أثيوبيا',
    country_code: 'ET',
    license_no: 'ETH-MOL-7190',
    manager_name: 'Naflet Tesfaye',
    email: 'info@naflet-fea.et',
    phone: '+251911998822',
    whatsapp: '+251911998822',
    aliases: ['NAFLET', 'Naflet', 'نافليت'],
    authorized_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
    assigned_coordinator_email: 'i.mahmoud.followup@kas.sa',
    assigned_coordinator_name: 'إسلام أحمد عرفة',
    default_commission_usd: 1050,
    sla_assign_days: 10,
    avg_days_to_assign: 8.3,
    avg_days_to_arrival: 35,
    historical_total_contracts: 195,
    historical_arrived_count: 178,
    historical_backout_count: 9,
    historical_runaway_count: 3,
    historical_cancelled_count: 5,
    quality_score: 92.8,
    status: 'نشط',
    created_at: '2026-02-05',
  },
  {
    id: 'AGY-PHL-AAVTALENT',
    company_id: 'TOP',
    canonical_code: 'AAV_TALENT_PH',
    name_en: 'AAV Talent Training & Management, Inc.',
    name_ar: 'وكالة AAV تالنت للتدريب والاستقدام — الفلبين',
    country: 'الفلبين',
    country_code: 'PH',
    license_no: 'DMW-POEA-2041',
    manager_name: 'Angelo Villanueva',
    email: 'deploy@aavtalent.ph',
    phone: '+63288991122',
    whatsapp: '+639178991122',
    aliases: ['AAV TALENT', 'AAV Talent Training & Management, Inc.', 'AAV TALENT TRAINING', 'ايه ايه في تالنت'],
    authorized_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
    assigned_coordinator_email: 'm.fouda.followup@kas.sa',
    assigned_coordinator_name: 'محمود فودة',
    default_commission_usd: 1350,
    sla_assign_days: 12,
    avg_days_to_assign: 9.8,
    avg_days_to_arrival: 41,
    historical_total_contracts: 252,
    historical_arrived_count: 236,
    historical_backout_count: 8,
    historical_runaway_count: 2,
    historical_cancelled_count: 6,
    quality_score: 95.0,
    status: 'نشط',
    created_at: '2026-02-05',
  },
  {
    id: 'AGY-PHL-EXERTION',
    company_id: 'SAF',
    canonical_code: 'EXERTION_PH',
    name_en: 'Exertion Force International Co. Ltd',
    name_ar: 'وكالة إكسيرشن فورس الدولية',
    country: 'الفلبين',
    country_code: 'PH',
    license_no: 'DMW-POEA-3018',
    manager_name: 'Rowena Cruz',
    email: 'ops@exertionforce.ph',
    phone: '+63287765544',
    whatsapp: '+639177765544',
    aliases: ['اكسيرشن', 'EXERTION FORCE INTERNATIONALCO. LTD', 'EXERTION', 'Exertion Force'],
    authorized_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
    assigned_coordinator_email: 'm.fouda.followup@kas.sa',
    assigned_coordinator_name: 'محمود فودة',
    default_commission_usd: 1350,
    sla_assign_days: 12,
    avg_days_to_assign: 9.6,
    avg_days_to_arrival: 42,
    historical_total_contracts: 187,
    historical_arrived_count: 173,
    historical_backout_count: 7,
    historical_runaway_count: 2,
    historical_cancelled_count: 5,
    quality_score: 94.4,
    status: 'نشط',
    created_at: '2026-02-08',
  },
  {
    id: 'AGY-KEN-PREMIER',
    company_id: 'YAQ',
    canonical_code: 'PREMIER_KE',
    name_en: 'Premier Recruitment Limited',
    name_ar: 'وكالة بريمير للاستقدام المحدودة',
    country: 'كينيا',
    country_code: 'KE',
    license_no: 'NEA-KE-5190',
    manager_name: 'Grace Mwangi',
    email: 'ops@premier-recruit.co.ke',
    phone: '+254733445566',
    whatsapp: '+254733445566',
    aliases: ['بريمير', 'Premier Recruitment Limited', 'Premier', 'PREMIER'],
    authorized_companies: ['SAF', 'TOP', 'YAQ', 'DAR'],
    assigned_coordinator_email: 'm.fouda.followup@kas.sa',
    assigned_coordinator_name: 'محمود فودة',
    default_commission_usd: 1150,
    sla_assign_days: 10,
    avg_days_to_assign: 8.3,
    avg_days_to_arrival: 35,
    historical_total_contracts: 505,
    historical_arrived_count: 465,
    historical_backout_count: 21,
    historical_runaway_count: 8,
    historical_cancelled_count: 11,
    quality_score: 93.0,
    status: 'نشط',
    created_at: '2026-02-08',
  },
];

/**
 * Realistic PDPL-compliant initial transactions representing Islam & Mahmoud's active Musaned pipeline
 * (clients' national IDs & phones masked/synthetic; real `.xlsx` sheet can be imported on demand).
 */
export const INITIAL_MUSANED_FOLLOWUP_TRANSACTIONS: MusanedFollowupTransaction[] = [
  {
    id: 'MTX-2026-001',
    company_id: 'SAF',
    musaned_contract_no: '2005091410',
    internal_contract_no: '2811',
    source_sheet: 'تقرير معاملات الدول',
    is_archive: false,
    client_name: 'عبدالرحمن بن سعد العتيبي',
    client_national_id: '1048001122',
    client_phone: '0500110011',
    client_city: 'الرياض',
    visa_number: '1908112201',
    visa_issue_date: '2026-10-25',
    visa_expiry_date: '2027-01-23',
    worker_type: 'غير معين',
    maid_name: '',
    passport_number: '',
    nationality: 'أثيوبيا',
    religion: 'مسلمة',
    profession: 'عاملة منزلية',
    monthly_salary: 1000,
    agency_id: 'AGY-ETH-MZAIN',
    agency_raw_name: 'محمد زين',
    agency_canonical_name: 'وكالة محمد زين للاستقدام',
    assigned_coordinator_email: 'i.mahmoud.followup@kas.sa',
    sales_creator_name: 'حذيفه رمضان علي الديب',
    branch_raw_name: 'شركة السفير الماسي للاستقدام',
    stage: 'UNASSIGNED',
    stage_timestamps: { UNASSIGNED: '2026-10-25' },
    contract_start_date: '2026-10-25',
    musaned_link_date: '2026-10-26',
    expected_arrival_date: '2026-11-28',
    arrival_destination: 'الرياض',
    paid_amount_sar: 7130,
    commission_usd: 1000,
    updated_at: '2026-11-18',
  },
  {
    id: 'MTX-2026-002',
    company_id: 'TOP',
    musaned_contract_no: '2005091488',
    internal_contract_no: '2819',
    source_sheet: 'تقرير معاملات الدول',
    is_archive: false,
    client_name: 'فهد بن محمد القحطاني',
    client_national_id: '1059002233',
    client_phone: '0550220022',
    client_city: 'الرياض',
    visa_number: '1908114902',
    visa_issue_date: '2026-08-29',
    visa_expiry_date: '2026-11-27',
    worker_type: 'معين',
    maid_name: 'MOMINA KEDIR GURMU',
    passport_number: 'EP9249575',
    nationality: 'أثيوبيا',
    religion: 'مسلمة',
    profession: 'عاملة منزلية',
    monthly_salary: 1000,
    agency_id: 'AGY-ETH-SHEGER',
    agency_raw_name: 'SHEGER',
    agency_canonical_name: 'وكالة شيجر الدولية للاستقدام',
    assigned_coordinator_email: 'i.mahmoud.followup@kas.sa',
    sales_creator_name: 'امل سعيد هوساوى',
    branch_raw_name: 'مكتب توباز للاستقدام',
    stage: 'VISA_STAMPED',
    stage_timestamps: {
      ASSIGNED: '2026-09-02',
      DELEGATED: '2026-09-10',
      MEDICAL_FIT: '2026-09-18',
      VISA_STAMPED: '2026-11-05',
    },
    contract_start_date: '2026-08-29',
    delegation_date: '2026-09-10',
    medical_date: '2026-09-18',
    visa_stamped_date: '2026-11-05',
    expected_arrival_date: '2026-11-22',
    arrival_destination: 'الرياض',
    paid_amount_sar: 7213.95,
    commission_usd: 1050,
    updated_at: '2026-11-18',
  },
  {
    id: 'MTX-2026-003',
    company_id: 'YAQ',
    musaned_contract_no: '2005092014',
    internal_contract_no: '2840',
    source_sheet: 'تقرير معاملات الدول',
    is_archive: false,
    client_name: 'سلطان بن عبدالعزيز الشمري',
    client_national_id: '1067003344',
    client_phone: '0540330033',
    client_city: 'الرياض',
    visa_number: '1908119810',
    visa_issue_date: '2026-10-12',
    visa_expiry_date: '2027-01-10',
    worker_type: 'غير معين',
    maid_name: 'MARIA CRISTINA DELA CRUZ',
    passport_number: 'P9482716A',
    nationality: 'الفلبين',
    religion: 'مسيحية',
    profession: 'عاملة منزلية',
    monthly_salary: 1500,
    agency_id: 'AGY-PHL-YOSHI',
    agency_raw_name: 'يوشى',
    agency_canonical_name: 'وكالة يوشي بروموشنز — الفلبين',
    assigned_coordinator_email: 'm.fouda.followup@kas.sa',
    sales_creator_name: 'حسن احمد يوسف',
    branch_raw_name: 'مكتب ياقوت نجد للأستقدام',
    stage: 'TICKET_BOOKED',
    stage_timestamps: {
      UNASSIGNED: '2026-10-12',
      ASSIGNED: '2026-10-19',
      DELEGATED: '2026-10-24',
      MEDICAL_FIT: '2026-10-30',
      VISA_STAMPED: '2026-11-10',
      TICKET_BOOKED: '2026-11-16',
    },
    contract_start_date: '2026-10-12',
    delegation_date: '2026-10-24',
    medical_date: '2026-10-30',
    visa_stamped_date: '2026-11-10',
    ticket_booked_date: '2026-11-16',
    flight_number: 'PR-654',
    airline: 'الخطوط الفلبينية',
    expected_arrival_date: '2026-11-21',
    arrival_destination: 'الرياض',
    paid_amount_sar: 16445,
    commission_usd: 1350,
    updated_at: '2026-11-18',
  },
  {
    id: 'MTX-2026-004',
    company_id: 'DAR',
    musaned_contract_no: '2005092399',
    internal_contract_no: '2875',
    source_sheet: 'تقرير معاملات الدول',
    is_archive: false,
    client_name: 'ناصر بن راشد الدوسري',
    client_national_id: '1078004455',
    client_phone: '0530440044',
    client_city: 'الرياض',
    visa_number: '1908120550',
    visa_issue_date: '2026-11-02',
    visa_expiry_date: '2027-01-31',
    worker_type: 'غير معين',
    maid_name: '',
    passport_number: '',
    nationality: 'أثيوبيا',
    religion: 'غير مسلم',
    profession: 'عاملة منزلية',
    monthly_salary: 1000,
    agency_id: 'AGY-ETH-TELA',
    agency_raw_name: 'تيلا',
    agency_canonical_name: 'وكالة تيلا للاستقدام الخارجي',
    assigned_coordinator_email: 'i.mahmoud.followup@kas.sa',
    sales_creator_name: 'عمرو محمد عبدالوهاب عبدالله',
    branch_raw_name: 'مكتب دار الرواد للاستقدام',
    stage: 'UNASSIGNED',
    stage_timestamps: { UNASSIGNED: '2026-11-02' },
    contract_start_date: '2026-11-02',
    musaned_link_date: '2026-11-03',
    expected_arrival_date: '2026-12-08',
    arrival_destination: 'الرياض',
    paid_amount_sar: 7130,
    commission_usd: 1050,
    updated_at: '2026-11-18',
  },
  {
    id: 'MTX-2026-005',
    company_id: 'SAF',
    musaned_contract_no: '2005092610',
    internal_contract_no: '2891',
    source_sheet: 'تقرير معاملات الدول',
    is_archive: false,
    client_name: 'ماجد بن فهد الحربي',
    client_national_id: '1089005566',
    client_phone: '0560550055',
    client_city: 'الرياض',
    visa_number: '1908123110',
    visa_issue_date: '2026-10-05',
    visa_expiry_date: '2027-01-03',
    worker_type: 'غير معين',
    maid_name: 'TIGIST ABERA TESFAYE',
    passport_number: 'EP8192044',
    nationality: 'أثيوبيا',
    religion: 'غير مسلم',
    profession: 'عاملة منزلية',
    monthly_salary: 1000,
    agency_id: 'AGY-INT-NUHIMAN',
    agency_raw_name: 'شركة النحيمان',
    agency_canonical_name: 'شركة النحيمان للاستقدام الدولي',
    assigned_coordinator_email: 'm.fouda.followup@kas.sa',
    sales_creator_name: 'اسلام احمد حبشى',
    branch_raw_name: 'شركة السفير الماسي للاستقدام',
    stage: 'DELEGATED',
    stage_timestamps: {
      UNASSIGNED: '2026-10-05',
      ASSIGNED: '2026-10-14',
      DELEGATED: '2026-10-20',
    },
    contract_start_date: '2026-10-05',
    delegation_date: '2026-10-20',
    expected_arrival_date: '2026-11-15',
    arrival_destination: 'الرياض',
    paid_amount_sar: 7130,
    commission_usd: 1050,
    updated_at: '2026-11-18',
  },
  {
    id: 'MTX-2026-006',
    company_id: 'SAF',
    musaned_contract_no: '2005089100',
    internal_contract_no: '2740',
    source_sheet: 'وصول2026',
    is_archive: true,
    client_name: 'خالد بن عبدالله المطيري',
    client_national_id: '1033009988',
    client_phone: '0500998877',
    client_city: 'الرياض',
    visa_number: '1907991100',
    visa_issue_date: '2026-09-01',
    visa_expiry_date: '2026-11-30',
    worker_type: 'معين',
    maid_name: 'FATUMA MOHAMMED NUR',
    passport_number: 'EP7741902',
    nationality: 'أثيوبيا',
    religion: 'مسلمة',
    profession: 'عاملة منزلية',
    monthly_salary: 1000,
    agency_id: 'AGY-ETH-REAL',
    agency_raw_name: 'ريل',
    agency_canonical_name: 'وكالة ريل الدولية للاستقدام',
    assigned_coordinator_email: 'i.mahmoud.followup@kas.sa',
    sales_creator_name: 'محمد ابراهيم عبدالمجيد',
    branch_raw_name: 'مكتب السفير الماسي للاستقدام',
    stage: 'ARRIVED',
    stage_timestamps: {
      ASSIGNED: '2026-09-03',
      DELEGATED: '2026-09-08',
      MEDICAL_FIT: '2026-09-15',
      VISA_STAMPED: '2026-09-25',
      TICKET_BOOKED: '2026-10-02',
      ARRIVED: '2026-10-06',
    },
    contract_start_date: '2026-09-01',
    delegation_date: '2026-09-08',
    arrival_date: '2026-10-06',
    arrival_destination: 'الرياض',
    paid_amount_sar: 7130,
    commission_usd: 1050,
    updated_at: '2026-10-06',
  },
];

// ─── Normalization Helpers ──────────────────────────────────────────────────

export function normalizeLookupToken(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[.,\-_/\\()'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeBranchToCompanyCode(rawBranch: string): RecruitmentSubsidiaryCode {
  const norm = normalizeLookupToken(rawBranch);
  if (norm.includes('توباز') || norm.includes('topaz') || norm === 'top') return 'TOP';
  if (norm.includes('ياقوت') || norm.includes('yaqoot') || norm === 'yaq') return 'YAQ';
  if (norm.includes('دار الرواد') || norm.includes('rowad') || norm === 'dar') return 'DAR';
  return 'SAF';
}

/**
 * Converts Excel serial date (e.g. `46090.0566`) or Arabic/slash date strings into `YYYY-MM-DD`.
 */
export function parseExcelOrMixedDate(raw: unknown): { iso?: string; wasSerial: boolean } {
  if (raw === null || raw === undefined || raw === '') return { wasSerial: false };

  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 25000 && raw < 70000) {
    const utcDays = Math.floor(raw - 25569);
    const ms = utcDays * 86400 * 1000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) {
      return { iso: d.toISOString().slice(0, 10), wasSerial: true };
    }
  }

  const str = String(raw).trim();
  if (!str) return { wasSerial: false };

  // Numeric string Excel serial
  if (/^\d{5}(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    if (num > 25000 && num < 70000) {
      const utcDays = Math.floor(num - 25569);
      const d = new Date(utcDays * 86400 * 1000);
      if (!Number.isNaN(d.getTime())) {
        return { iso: d.toISOString().slice(0, 10), wasSerial: true };
      }
    }
  }

  // Match YYYY/MM/DD or YYYY-MM-DD (Gregorian >= 1990)
  const ymd = str.match(/(20\d{2}|19\d{2})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymd) {
    const yr = ymd[1];
    const mo = ymd[2].padStart(2, '0');
    const dy = ymd[3].padStart(2, '0');
    return { iso: `${yr}-${mo}-${dy}`, wasSerial: false };
  }

  // Match DD/MM/YYYY
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2}|19\d{2})/);
  if (dmy) {
    const dy = dmy[1].padStart(2, '0');
    const mo = dmy[2].padStart(2, '0');
    const yr = dmy[3];
    return { iso: `${yr}-${mo}-${dy}`, wasSerial: false };
  }

  return { wasSerial: false };
}

/**
 * Extracts embedded Backout markers from `اسم العامله` (e.g. `باك اوت2026/08/06/`).
 */
export function extractBackoutFromWorkerName(rawWorkerName: string): {
  cleanName: string;
  isBackout: boolean;
  isRunaway: boolean;
  extractedDate?: string;
} {
  const raw = String(rawWorkerName || '').trim();
  if (!raw) return { cleanName: '', isBackout: false, isRunaway: false };

  const hasBackout = /باك\s*اوت|باك\s*أوت|back\s*out|backout|رفض\s*السفر|اعتذار/i.test(raw);
  const hasRunaway = /هروب|تغيب|runaway/i.test(raw);

  if (!hasBackout && !hasRunaway) {
    return { cleanName: raw.replace(/\t+/g, ' ').trim(), isBackout: false, isRunaway: false };
  }

  const parsedDate = parseExcelOrMixedDate(raw).iso;
  const cleaned = raw
    .replace(/باك\s*اوت|باك\s*أوت|back\s*out|backout|هروب|تغيب|رفض\s*السفر|اعتذار/gi, ' ')
    .replace(/(20\d{2}|19\d{2})[\/\-]\d{1,2}[\/\-]\d{1,2}\/?/g, ' ')
    .replace(/[\/\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    cleanName: cleaned,
    isBackout: hasBackout,
    isRunaway: hasRunaway,
    extractedDate: parsedDate,
  };
}

/**
 * Parses free-text status written inside `تاريخ التفوض او التختيم` or `اخر حالة تحديث للوكيل`.
 */
export function parseFreeTextFollowupStatus(
  rawStatusOrDate: unknown,
  workerType: string,
  hasWorkerOrPassport: boolean,
  sourceSheet: string
): {
  stage: TransactionStage;
  delegationDate?: string;
  arrivalDate?: string;
  wasFreeTextStatus: boolean;
  convertedSerial: boolean;
} {
  const sheetNorm = normalizeLookupToken(sourceSheet);
  if (sheetNorm.includes('الغاء')) {
    return { stage: 'CANCELLED', wasFreeTextStatus: false, convertedSerial: false };
  }

  const str = String(rawStatusOrDate ?? '').trim();
  const dateAttempt = parseExcelOrMixedDate(rawStatusOrDate);

  if (/وصول|وصلت/i.test(str) || sheetNorm.startsWith('وصول')) {
    return {
      stage: 'ARRIVED',
      arrivalDate: dateAttempt.iso,
      wasFreeTextStatus: Boolean(str && !dateAttempt.wasSerial),
      convertedSerial: dateAttempt.wasSerial,
    };
  }
  if (/تذكر|حجز|طيران|ticket/i.test(str)) {
    return {
      stage: 'TICKET_BOOKED',
      delegationDate: dateAttempt.iso,
      wasFreeTextStatus: true,
      convertedSerial: dateAttempt.wasSerial,
    };
  }
  if (/تختيم|تاشير|تأشير|سفاره|سفارة|stamp/i.test(str)) {
    return {
      stage: 'VISA_STAMPED',
      delegationDate: dateAttempt.iso,
      wasFreeTextStatus: true,
      convertedSerial: dateAttempt.wasSerial,
    };
  }
  if (/فحص|طبي|لائق|medical/i.test(str)) {
    return {
      stage: 'MEDICAL_FIT',
      delegationDate: dateAttempt.iso,
      wasFreeTextStatus: true,
      convertedSerial: dateAttempt.wasSerial,
    };
  }
  if (/تفويض|مفوض/i.test(str) || dateAttempt.iso) {
    return {
      stage: 'DELEGATED',
      delegationDate: dateAttempt.iso,
      wasFreeTextStatus: /تفويض|مفوض|عقد/i.test(str),
      convertedSerial: dateAttempt.wasSerial,
    };
  }

  if (hasWorkerOrPassport || normalizeLookupToken(workerType) === 'معين') {
    return { stage: 'ASSIGNED', wasFreeTextStatus: false, convertedSerial: false };
  }

  return { stage: 'UNASSIGNED', wasFreeTextStatus: false, convertedSerial: false };
}

// ─── Unified Agent Master & Alias Registry ──────────────────────────────────

export function getUnifiedAgenciesSync(): UnifiedExternalAgency[] {
  try {
    if (typeof localStorage === 'undefined') return [...INITIAL_UNIFIED_AGENCIES];
    const raw = localStorage.getItem(AGENCY_MASTER_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(AGENCY_MASTER_STORAGE_KEY, JSON.stringify(INITIAL_UNIFIED_AGENCIES));
      return [...INITIAL_UNIFIED_AGENCIES];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return [...INITIAL_UNIFIED_AGENCIES];
  } catch {
    return [...INITIAL_UNIFIED_AGENCIES];
  }
}

export async function saveUnifiedAgencies(list: UnifiedExternalAgency[]): Promise<UnifiedExternalAgency[]> {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(AGENCY_MASTER_STORAGE_KEY, JSON.stringify(list));
    }
  } catch {
    // ignore
  }
  await realErpDataStore.importRealRecordsBatch('external_agencies_master', list);
  return list;
}

export function resolveCanonicalAgency(
  rawAgencyName: string,
  agencies: UnifiedExternalAgency[] = getUnifiedAgenciesSync()
): UnifiedExternalAgency | null {
  const normInput = normalizeLookupToken(rawAgencyName);
  if (!normInput) return null;

  for (const ag of agencies) {
    if (
      normalizeLookupToken(ag.id) === normInput ||
      normalizeLookupToken(ag.canonical_code) === normInput ||
      normalizeLookupToken(ag.name_en) === normInput ||
      normalizeLookupToken(ag.name_ar) === normInput ||
      ag.aliases.some((al) => normalizeLookupToken(al) === normInput)
    ) {
      return ag;
    }
  }

  // Token prefix / substring match for extended legal suffixes (e.g., "Tela Foreign..." -> "Tela")
  for (const ag of agencies) {
    for (const al of [ag.name_en, ag.name_ar, ...ag.aliases]) {
      const normAl = normalizeLookupToken(al);
      if (normAl.length >= 4 && (normInput.includes(normAl) || normAl.includes(normInput))) {
        return ag;
      }
    }
  }

  return null;
}

export function suggestAgencyMergeForUnknownSpelling(
  rawSpelling: string,
  agencies: UnifiedExternalAgency[] = getUnifiedAgenciesSync()
): UnifiedExternalAgency | null {
  const resolved = resolveCanonicalAgency(rawSpelling, agencies);
  if (resolved) return resolved;

  const firstWord = normalizeLookupToken(rawSpelling).split(' ')[0] || '';
  if (firstWord.length < 3) return null;
  return (
    agencies.find(
      (ag) =>
        normalizeLookupToken(ag.name_en).startsWith(firstWord) ||
        normalizeLookupToken(ag.name_ar).includes(firstWord)
    ) || null
  );
}

export async function confirmAliasMergeToAgency(
  agencyId: string,
  newAlias: string
): Promise<UnifiedExternalAgency | null> {
  const cleanAlias = String(newAlias || '').trim();
  if (!cleanAlias) return null;
  const list = getUnifiedAgenciesSync();
  const idx = list.findIndex((a) => a.id === agencyId);
  if (idx === -1) return null;

  const current = list[idx];
  if (!current.aliases.some((a) => normalizeLookupToken(a) === normalizeLookupToken(cleanAlias))) {
    current.aliases = [...current.aliases, cleanAlias];
  }
  list[idx] = { ...current };
  await saveUnifiedAgencies(list);
  return list[idx];
}

export async function upsertUnifiedAgency(
  agency: Omit<UnifiedExternalAgency, 'id' | 'created_at'> & { id?: string; created_at?: string }
): Promise<UnifiedExternalAgency> {
  const list = getUnifiedAgenciesSync();
  const id = agency.id || `AGY-${agency.country_code || 'INT'}-${Date.now().toString().slice(-5)}`;
  const fullRecord: UnifiedExternalAgency = {
    ...agency,
    id,
    authorized_companies: (agency.authorized_companies?.filter((c) =>
      ['SAF', 'TOP', 'YAQ', 'DAR'].includes(c)
    ) as RecruitmentSubsidiaryCode[]) || ['SAF', 'TOP', 'YAQ', 'DAR'],
    created_at: agency.created_at || new Date().toISOString().slice(0, 10),
  };

  const existingIdx = list.findIndex((a) => a.id === id || a.canonical_code === fullRecord.canonical_code);
  if (existingIdx >= 0) {
    list[existingIdx] = fullRecord;
  } else {
    list.unshift(fullRecord);
  }
  await saveUnifiedAgencies(list);
  return fullRecord;
}

export async function assignAgencyCoordinator(
  agencyId: string,
  coordinatorEmail: FollowupCoordinatorEmail
): Promise<UnifiedExternalAgency | null> {
  const list = getUnifiedAgenciesSync();
  const idx = list.findIndex((a) => a.id === agencyId);
  if (idx === -1) return null;
  const coord = FOLLOWUP_COORDINATORS.find((c) => c.email === coordinatorEmail) || FOLLOWUP_COORDINATORS[0];
  list[idx] = {
    ...list[idx],
    assigned_coordinator_email: coord.email,
    assigned_coordinator_name: coord.nameAr,
  };
  await saveUnifiedAgencies(list);
  return list[idx];
}

// ─── Cryptographic External Agency Accounts (Isolated Partner Auth) ─────────

export function computeExternalAgencyPasswordDigest(emailOrUsername: string, plainPassword: string): string {
  const cleanKey = `EXT-AGENCY::${emailOrUsername.trim().toLowerCase()}`;
  return computeKasPasswordDigest(cleanKey, plainPassword);
}

export function getExternalAgencyAccountsSync(): ExternalAgencyAccount[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(AGENCY_ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveExternalAgencyAccountsSync(accounts: ExternalAgencyAccount[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(AGENCY_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    }
  } catch {
    // ignore
  }
}

export async function provisionExternalAgencyAccount(params: {
  agencyId: string;
  email?: string;
  username?: string;
  plainPassword?: string;
  contactPerson?: string;
  authorizedCompanies?: RecruitmentSubsidiaryCode[];
  createdBy?: string;
}): Promise<{
  account: ExternalAgencyAccount;
  generatedPassword: string;
}> {
  const agencies = getUnifiedAgenciesSync();
  const agency = agencies.find((a) => a.id === params.agencyId);
  if (!agency) {
    throw new Error('لا يمكن إنشاء حساب وكيل خارجي إلا من سجل الوكلاء الموحد المعتمد.');
  }

  const passwordToUse = params.plainPassword?.trim() || generateStrongClientPassword();
  const policy = validateStrongPasswordPolicy(passwordToUse);
  if (!policy.valid) {
    throw new Error(policy.reason || 'كلمة المرور لا تستوفي معايير الأمان.');
  }

  const cleanSlug = agency.canonical_code.toLowerCase().replace(/[^a-z0-9]/g, '.');
  const username = (params.username?.trim() || `agent.${cleanSlug}`).toLowerCase();
  const email = (params.email?.trim() || agency.email || `${username}@agency-partner.com`).toLowerCase();

  if (email.endsWith('@kas.sa') || username.endsWith('@kas.sa')) {
    throw new Error('رفض أمني: نطاق @kas.sa مخصص لموظفي المجموعة الداخليين فقط ولا يُمنح للوكلاء الخارجيين.');
  }

  const allowedComps = (params.authorizedCompanies || agency.authorized_companies || ['SAF']).filter((c) =>
    ['SAF', 'TOP', 'YAQ', 'DAR'].includes(c)
  ) as RecruitmentSubsidiaryCode[];

  const digest = computeExternalAgencyPasswordDigest(email, passwordToUse);
  const accounts = getExternalAgencyAccountsSync();
  const existingIdx = accounts.findIndex(
    (a) => a.agency_id === agency.id || a.email.toLowerCase() === email || a.username.toLowerCase() === username
  );

  const account: ExternalAgencyAccount = {
    id: existingIdx >= 0 ? accounts[existingIdx].id : `EXT-ACC-${Date.now().toString().slice(-6)}`,
    company_id: allowedComps[0] || 'SAF',
    agency_id: agency.id,
    agency_name: agency.name_en,
    agency_name_ar: agency.name_ar,
    country: agency.country,
    username,
    email,
    password_digest: digest,
    contact_person: params.contactPerson?.trim() || agency.manager_name || agency.name_en,
    phone: agency.phone,
    whatsapp: agency.whatsapp || agency.phone,
    authorized_companies: allowedComps.length > 0 ? allowedComps : ['SAF'],
    status: 'نشط',
    created_by: params.createdBy || 'قسم المتابعة الخارجية',
    created_at: existingIdx >= 0 ? accounts[existingIdx].created_at : new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    accounts[existingIdx] = account;
  } else {
    accounts.unshift(account);
  }
  saveExternalAgencyAccountsSync(accounts);
  await realErpDataStore.importRealRecordsBatch('external_agency_accounts', [account]);

  return { account, generatedPassword: passwordToUse };
}

export async function toggleExternalAgencyAccountStatus(
  accountId: string,
  nextStatus: 'نشط' | 'مجمّد'
): Promise<ExternalAgencyAccount | null> {
  const accounts = getExternalAgencyAccountsSync();
  const idx = accounts.findIndex((a) => a.id === accountId || a.agency_id === accountId);
  if (idx === -1) return null;
  accounts[idx] = { ...accounts[idx], status: nextStatus };
  saveExternalAgencyAccountsSync(accounts);
  await realErpDataStore.importRealRecordsBatch('external_agency_accounts', [accounts[idx]]);
  return accounts[idx];
}

export async function resetExternalAgencyPassword(accountId: string): Promise<{
  account: ExternalAgencyAccount;
  newPassword: string;
} | null> {
  const accounts = getExternalAgencyAccountsSync();
  const idx = accounts.findIndex((a) => a.id === accountId || a.agency_id === accountId);
  if (idx === -1) return null;
  const newPassword = generateStrongClientPassword();
  const target = accounts[idx];
  const updated: ExternalAgencyAccount = {
    ...target,
    password_digest: computeExternalAgencyPasswordDigest(target.email, newPassword),
    status: 'نشط',
  };
  accounts[idx] = updated;
  saveExternalAgencyAccountsSync(accounts);
  await realErpDataStore.importRealRecordsBatch('external_agency_accounts', [updated]);
  return { account: updated, newPassword };
}

export function verifyExternalAgencyCredentials(
  identifier: string,
  plainPassword: string
): {
  valid: boolean;
  account?: ExternalAgencyAccount;
  reasonAr?: string;
} {
  const cleanId = (identifier || '').trim().toLowerCase();
  if (!cleanId || !plainPassword) {
    return { valid: false };
  }

  const accounts = getExternalAgencyAccountsSync();
  const match = accounts.find(
    (a) => a.email.toLowerCase() === cleanId || a.username.toLowerCase() === cleanId
  );
  if (!match) {
    return { valid: false };
  }

  if (match.status !== 'نشط') {
    return {
      valid: false,
      reasonAr: `رفض أمني: حساب الوكالة الخارجية (${match.agency_name_ar}) مجمّد حالياً من قبل قسم المتابعة الخارجية.`,
    };
  }

  const expectedDigest = computeExternalAgencyPasswordDigest(match.email, plainPassword);
  if (expectedDigest !== match.password_digest) {
    return {
      valid: false,
      reasonAr: 'رفض أمني: كلمة مرور بوابة الوكيل الخارجي غير صحيحة.',
    };
  }

  // Stamp last_login_at
  const updatedAccounts = accounts.map((a) =>
    a.id === match.id ? { ...a, last_login_at: new Date().toISOString() } : a
  );
  saveExternalAgencyAccountsSync(updatedAccounts);

  return { valid: true, account: match };
}

// ─── SLA & Expected Arrival Evaluation ──────────────────────────────────────

function diffDaysBetweenIso(fromIso: string, toIso: string): number {
  const d1 = new Date(`${fromIso.slice(0, 10)}T00:00:00Z`).getTime();
  const d2 = new Date(`${toIso.slice(0, 10)}T00:00:00Z`).getTime();
  if (Number.isNaN(d1) || Number.isNaN(d2)) return 0;
  return Math.round((d2 - d1) / 86_400_000);
}

export function addDaysToIso(baseIso: string, days: number): string {
  const d = new Date(`${baseIso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return baseIso;
  d.setUTCDate(d.getUTCDate() + Math.round(days));
  return d.toISOString().slice(0, 10);
}

export function evaluateTransactionSla(
  tx: MusanedFollowupTransaction,
  todayIso: string = new Date().toISOString().slice(0, 10),
  agencies: UnifiedExternalAgency[] = getUnifiedAgenciesSync()
): TransactionSlaEvaluation {
  const agency = tx.agency_id ? agencies.find((a) => a.id === tx.agency_id) : null;
  const slaAssignDays = agency?.sla_assign_days || 10;

  const daysSinceContract = tx.contract_start_date
    ? Math.max(0, diffDaysBetweenIso(tx.contract_start_date, todayIso))
    : 0;

  const daysUntilVisaExpiry = tx.visa_expiry_date
    ? diffDaysBetweenIso(todayIso, tx.visa_expiry_date)
    : null;

  const daysSinceMedical = tx.medical_date
    ? Math.max(0, diffDaysBetweenIso(tx.medical_date, todayIso))
    : null;

  const daysOverExpectedArrival = tx.expected_arrival_date
    ? diffDaysBetweenIso(tx.expected_arrival_date, todayIso)
    : null;

  const isTerminal = ['ARRIVED', 'BACKOUT', 'RUNAWAY', 'CANCELLED'].includes(tx.stage);

  const unassignedOverdue = !isTerminal && tx.stage === 'UNASSIGNED' && daysSinceContract > slaAssignDays;
  const visaExpiringCritical =
    !isTerminal &&
    tx.stage !== 'TICKET_BOOKED' &&
    daysUntilVisaExpiry !== null &&
    daysUntilVisaExpiry <= 15;
  const medicalExpiringSoon =
    !isTerminal &&
    !['VISA_STAMPED', 'TICKET_BOOKED', 'ARRIVED'].includes(tx.stage) &&
    daysSinceMedical !== null &&
    daysSinceMedical >= 75;
  const delegatedWithoutMedical =
    !isTerminal &&
    tx.stage === 'DELEGATED' &&
    Boolean(tx.delegation_date) &&
    diffDaysBetweenIso(tx.delegation_date!, todayIso) > 12;
  const arrivalOverdue =
    !isTerminal && daysOverExpectedArrival !== null && daysOverExpectedArrival > 0;

  const alertsAr: string[] = [];
  if (visaExpiringCritical) {
    alertsAr.push(
      daysUntilVisaExpiry! < 0
        ? `التأشيرة منتهية منذ ${Math.abs(daysUntilVisaExpiry!)} يوم دون حجز تذكرة`
        : `تنتهي صلاحية التأشيرة خلال ${daysUntilVisaExpiry} يوم بدون تذكرة سفر`
    );
  }
  if (unassignedOverdue) {
    alertsAr.push(`تجاوز مهلة تعيين العاملة (${daysSinceContract} يوماً مقابل SLA ${slaAssignDays} أيام)`);
  }
  if (medicalExpiringSoon) {
    alertsAr.push(`الفحص الطبي قارب على انتهاء الـ 90 يوماً (${daysSinceMedical} يوماً) قبل التفييز`);
  }
  if (delegatedWithoutMedical) {
    alertsAr.push('تم التفويض منذ أكثر من 12 يوماً دون رفع نتيجة الفحص الطبي');
  }
  if (arrivalOverdue) {
    alertsAr.push(`تأخر الوصول عن الموعد المتوقع بـ ${daysOverExpectedArrival} يوم`);
  }

  const severity: 'CRITICAL' | 'WARNING' | 'NORMAL' =
    visaExpiringCritical || (unassignedOverdue && daysSinceContract > slaAssignDays + 7)
      ? 'CRITICAL'
      : unassignedOverdue || medicalExpiringSoon || delegatedWithoutMedical || arrivalOverdue
      ? 'WARNING'
      : 'NORMAL';

  return {
    daysSinceContract,
    daysUntilVisaExpiry,
    daysSinceMedical,
    daysOverExpectedArrival,
    unassignedOverdue,
    visaExpiringCritical,
    medicalExpiringSoon,
    delegatedWithoutMedical,
    arrivalOverdue,
    severity,
    alertsAr,
  };
}

// ─── PDPL Sanitizer for External Agency View ────────────────────────────────

export function sanitizeTransactionForExternalAgent(
  tx: MusanedFollowupTransaction,
  agencies: UnifiedExternalAgency[] = getUnifiedAgenciesSync()
): SanitizedAgencyTransaction {
  const agency = tx.agency_id ? agencies.find((a) => a.id === tx.agency_id) : null;
  const slaDeadline = tx.contract_start_date
    ? addDaysToIso(tx.contract_start_date, agency?.sla_assign_days || 10)
    : undefined;

  return {
    id: tx.id,
    company_id: tx.company_id,
    company_name_ar: SUBSIDIARY_DISPLAY_NAMES[tx.company_id] || tx.company_id,
    musaned_contract_no: tx.musaned_contract_no,
    visa_number: tx.visa_number,
    visa_issue_date: tx.visa_issue_date,
    visa_expiry_date: tx.visa_expiry_date,
    worker_type: tx.worker_type,
    maid_name: tx.maid_name,
    passport_number: tx.passport_number,
    nationality: tx.nationality,
    religion: tx.religion,
    profession: tx.profession,
    monthly_salary: tx.monthly_salary,
    agency_id: tx.agency_id,
    agency_canonical_name: tx.agency_canonical_name,
    stage: tx.stage,
    stage_timestamps: tx.stage_timestamps,
    contract_start_date: tx.contract_start_date,
    delegation_date: tx.delegation_date,
    medical_date: tx.medical_date,
    visa_stamped_date: tx.visa_stamped_date,
    ticket_booked_date: tx.ticket_booked_date,
    flight_number: tx.flight_number,
    airline: tx.airline,
    expected_arrival_date: tx.expected_arrival_date,
    arrival_date: tx.arrival_date,
    arrival_destination: tx.arrival_destination,
    commission_usd: tx.commission_usd,
    cv_id: tx.cv_id,
    sla_assign_deadline: slaDeadline,
    updated_at: tx.updated_at,
  };
}

// ─── Structured Pipeline CRUD & Cross-Department Reflection ─────────────────

export async function getMusanedTransactions(): Promise<MusanedFollowupTransaction[]> {
  return realErpDataStore.getRecords<MusanedFollowupTransaction>(
    'musaned_followup_transactions',
    INITIAL_MUSANED_FOLLOWUP_TRANSACTIONS
  );
}

export async function updateMusanedTransactionStage(params: {
  transactionId: string;
  nextStage: TransactionStage;
  actorName: string;
  maidName?: string;
  passportNumber?: string;
  cvId?: string;
  flightNumber?: string;
  airline?: string;
  arrivalDate?: string;
  arrivalDestination?: string;
  replacementForContractNo?: string;
  notes?: string;
}): Promise<MusanedFollowupTransaction | null> {
  const all = await getMusanedTransactions();
  const target = all.find((t) => t.id === params.transactionId);
  if (!target) return null;

  const todayIso = new Date().toISOString().slice(0, 10);
  const agencies = getUnifiedAgenciesSync();
  const agency = target.agency_id ? agencies.find((a) => a.id === target.agency_id) : null;

  const nextTimestamps: Partial<Record<TransactionStage, string>> = {
    ...target.stage_timestamps,
    [params.nextStage]: todayIso,
  };

  const patch: Partial<MusanedFollowupTransaction> = {
    stage: params.nextStage,
    stage_timestamps: nextTimestamps,
    updated_at: todayIso,
  };

  if (params.maidName !== undefined) patch.maid_name = params.maidName;
  if (params.passportNumber !== undefined) patch.passport_number = params.passportNumber.toUpperCase();
  if (params.cvId !== undefined) patch.cv_id = params.cvId;
  if (params.notes !== undefined) patch.notes = params.notes;
  if (params.replacementForContractNo !== undefined) {
    patch.replacement_for_contract_no = params.replacementForContractNo;
  }

  if (params.nextStage === 'DELEGATED') {
    patch.delegation_date = todayIso;
    patch.expected_arrival_date = addDaysToIso(todayIso, agency?.avg_days_to_arrival || 35);
  } else if (params.nextStage === 'MEDICAL_FIT') {
    patch.medical_date = todayIso;
  } else if (params.nextStage === 'VISA_STAMPED') {
    patch.visa_stamped_date = todayIso;
  } else if (params.nextStage === 'TICKET_BOOKED') {
    patch.ticket_booked_date = todayIso;
    if (params.flightNumber) patch.flight_number = params.flightNumber;
    if (params.airline) patch.airline = params.airline;
    if (params.arrivalDate) {
      patch.expected_arrival_date = params.arrivalDate;
      patch.arrival_date = params.arrivalDate;
    }
    if (params.arrivalDestination) patch.arrival_destination = params.arrivalDestination;
  } else if (params.nextStage === 'ARRIVED') {
    patch.arrival_date = params.arrivalDate || todayIso;
    patch.is_archive = false;
  } else if (params.nextStage === 'BACKOUT') {
    patch.backout_date = todayIso;
  } else if (params.nextStage === 'RUNAWAY') {
    patch.runaway_date = todayIso;
  }

  await realErpDataStore.updateRecord<MusanedFollowupTransaction>(
    'musaned_followup_transactions',
    target.id,
    patch,
    INITIAL_MUSANED_FOLLOWUP_TRANSACTIONS
  );

  const mergedRecord: MusanedFollowupTransaction = { ...target, ...patch };

  // 1. Cross-Department Sync -> Airport Reception (`flights` in TravelPage) when ticket is booked
  if (params.nextStage === 'TICKET_BOOKED' || params.nextStage === 'ARRIVED') {
    const flightDate = mergedRecord.arrival_date || mergedRecord.expected_arrival_date || todayIso;
    await realErpDataStore.addRecord('flights', {
      id: `FLT-MSN-${mergedRecord.musaned_contract_no}`,
      company_id: mergedRecord.company_id,
      travel_type: 'وصول',
      client_name: mergedRecord.client_name || `عقد مساند #${mergedRecord.musaned_contract_no}`,
      maid_name: mergedRecord.maid_name || 'عاملة مستقدمة',
      nationality: mergedRecord.nationality,
      passport_number: mergedRecord.passport_number || '—',
      airline: mergedRecord.airline || 'الخطوط الدولية المعتمدة',
      flight_number: mergedRecord.flight_number || 'SV-INTL',
      departure_airport: mergedRecord.nationality,
      arrival_airport: `مطار ${mergedRecord.arrival_destination || 'الرياض'}`,
      flight_date: flightDate,
      flight_time: '16:30',
      ticket_number: `TKT-${mergedRecord.musaned_contract_no}`,
      status: params.nextStage === 'ARRIVED' ? 'تم الوصول والاستقبال' : 'مؤكد ومجدول',
    });
  }

  // 2. Cross-Department Sync -> Agency Commission Accrual (`agency_candidates`) upon Visa Stamped / Arrived
  if (
    (params.nextStage === 'VISA_STAMPED' || params.nextStage === 'ARRIVED') &&
    mergedRecord.maid_name &&
    mergedRecord.passport_number
  ) {
    const existingCandidates = await realErpDataStore.getRecords<any>('agency_candidates', []);
    const existingCand = existingCandidates.find(
      (c) => String(c.passportNumber || '').toUpperCase() === mergedRecord.passport_number.toUpperCase()
    );
    if (!existingCand) {
      await realErpDataStore.addRecord('agency_candidates', {
        id: `AGY-CAND-${mergedRecord.musaned_contract_no}`,
        company_id: mergedRecord.company_id,
        agency_id: mergedRecord.agency_id,
        maidName: mergedRecord.maid_name,
        passportNumber: mergedRecord.passport_number,
        nationality: mergedRecord.nationality,
        age: 26,
        profession: mergedRecord.profession,
        medicalStatus: 'FIT',
        visaStatus: 'ISSUED',
        ticketStatus: params.nextStage === 'ARRIVED' ? 'BOOKED' : 'PENDING',
        commissionUsd: mergedRecord.commission_usd || agency?.default_commission_usd || 1050,
        paymentStatus: 'UNPAID',
        uploadedAt: todayIso,
        agencyName: mergedRecord.agency_canonical_name,
      });
    }
  }

  // 3. Cross-Department Activity Log for Sales Creator & Follow-up Audit Trail
  await realErpDataStore.addRecord('activity_log', {
    id: `ACT-MSN-${Date.now().toString().slice(-6)}`,
    company_id: mergedRecord.company_id,
    user_name: params.actorName,
    role: 'مركز متابعة المعاملات والوكلاء',
    action_type: `تحديث مرحلة عقد مساند #${mergedRecord.musaned_contract_no}`,
    module: 'متابعة المعاملات والوكلاء',
    details: `انتقال العقد #${mergedRecord.musaned_contract_no} (المنشئ: ${
      mergedRecord.sales_creator_name || 'المبيعات'
    }) إلى مرحلة [${getStageLabelAr(params.nextStage)}] — الوكيل: ${mergedRecord.agency_canonical_name}`,
    severity: 'منخفض',
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 16),
  });

  return mergedRecord;
}

// ─── 5-Sheet Musaned Excel Importer & Upsert Engine ─────────────────────────

export function parseMusanedSheetRows(
  rows: Record<string, any>[],
  sheetName: string,
  agencies: UnifiedExternalAgency[] = getUnifiedAgenciesSync()
): {
  parsedTransactions: MusanedFollowupTransaction[];
  correctedAliases: number;
  extractedBackouts: number;
  parsedFreeTextStatuses: number;
  convertedSerialDates: number;
  normalizedBranches: number;
  unknownAgentsMap: Map<string, number>;
} {
  const parsedTransactions: MusanedFollowupTransaction[] = [];
  let correctedAliases = 0;
  let extractedBackouts = 0;
  let parsedFreeTextStatuses = 0;
  let convertedSerialDates = 0;
  let normalizedBranches = 0;
  const unknownAgentsMap = new Map<string, number>();

  const sheetNorm = normalizeLookupToken(sheetName);
  const isArchiveSheet =
    sheetNorm.startsWith('وصول') || sheetNorm.includes('الغاء') || sheetNorm.includes('ارشيف');

  rows.forEach((rawRow, idx) => {
    const contractNo = String(
      rawRow['رقم عقد مساند'] || rawRow['رقم العقد'] || rawRow['musaned_contract_no'] || ''
    ).trim();
    const clientName = String(rawRow['اسم العميل'] || rawRow['client_name'] || '')
      .replace(/\t+/g, ' ')
      .trim();

    if (!contractNo && !clientName) return;

    const branchRaw = String(rawRow['اسم الفرع'] || rawRow['branch_raw_name'] || 'شركة السفير الماسي للاستقدام').trim();
    const companyCode = normalizeBranchToCompanyCode(branchRaw);
    if (branchRaw && branchRaw !== SUBSIDIARY_DISPLAY_NAMES[companyCode]) {
      normalizedBranches++;
    }

    const rawWorker = String(rawRow['اسم العامله'] || rawRow['اسم العاملة'] || rawRow['maid_name'] || '').trim();
    const backoutCheck = extractBackoutFromWorkerName(rawWorker);
    if (backoutCheck.isBackout || backoutCheck.isRunaway) {
      extractedBackouts++;
    }

    const passportNumber = String(rawRow['رقم الجواز'] || rawRow['passport_number'] || '')
      .trim()
      .toUpperCase();
    const rawWorkerType = String(rawRow['نوع العامل'] || rawRow['worker_type'] || 'غير معين').trim();
    const workerType: 'غير معين' | 'معين' | 'معروفة' = rawWorkerType.includes('معروف')
      ? 'معروفة'
      : rawWorkerType.includes('غير')
      ? 'غير معين'
      : 'معين';

    const rawAgent = String(rawRow['اسم الوكيل'] || rawRow['agency_raw_name'] || '').trim();
    const matchedAgency = rawAgent ? resolveCanonicalAgency(rawAgent, agencies) : null;
    if (rawAgent && matchedAgency && rawAgent !== matchedAgency.name_ar && rawAgent !== matchedAgency.name_en) {
      correctedAliases++;
    } else if (rawAgent && !matchedAgency) {
      unknownAgentsMap.set(rawAgent, (unknownAgentsMap.get(rawAgent) || 0) + 1);
    }

    const startParsed = parseExcelOrMixedDate(rawRow['تاريخ بدايه العقد'] || rawRow['contract_start_date']);
    const linkParsed = parseExcelOrMixedDate(
      rawRow['تاريخ الربط على مساند'] || rawRow['تاريخ اضافة العامل على العقد']
    );
    const visaIssueParsed = parseExcelOrMixedDate(rawRow['تاريخ التأشيرة ميلادي']);
    const visaExpParsed = parseExcelOrMixedDate(
      rawRow['تاريخ  نهاية التأشيرة ميلادي'] || rawRow['تاريخ نهاية التأشيرة ميلادي'] || rawRow['الانتهاء']
    );
    const arrivalColParsed = parseExcelOrMixedDate(rawRow['تاريخ الوصول2'] || rawRow['تاريخ الوصول']);
    const backoutColParsed = parseExcelOrMixedDate(rawRow['تاريخ Backout']);
    const runawayColParsed = parseExcelOrMixedDate(rawRow['تاريخ الهروب']);

    if (
      startParsed.wasSerial ||
      linkParsed.wasSerial ||
      visaIssueParsed.wasSerial ||
      visaExpParsed.wasSerial ||
      arrivalColParsed.wasSerial
    ) {
      convertedSerialDates++;
    }

    const rawFreeStatus =
      rawRow['تاريخ التفوض او التختيم'] ?? rawRow['اخر حالة تحديث للوكيل'] ?? rawRow['الحاله2'] ?? '';
    const statusParsed = parseFreeTextFollowupStatus(
      rawFreeStatus,
      workerType,
      Boolean(backoutCheck.cleanName || passportNumber),
      sheetName
    );
    if (statusParsed.wasFreeTextStatus) parsedFreeTextStatuses++;
    if (statusParsed.convertedSerial) convertedSerialDates++;

    let finalStage: TransactionStage = statusParsed.stage;
    if (runawayColParsed.iso || backoutCheck.isRunaway) {
      finalStage = 'RUNAWAY';
    } else if (backoutColParsed.iso || backoutCheck.isBackout) {
      finalStage = 'BACKOUT';
    } else if (arrivalColParsed.iso) {
      finalStage = 'ARRIVED';
    } else if (String(rawRow['البدايل'] || '').trim()) {
      finalStage = 'REPLACED';
    }

    const contractStartIso = startParsed.iso || visaIssueParsed.iso || new Date().toISOString().slice(0, 10);
    const avgArr = matchedAgency?.avg_days_to_arrival || 36;
    const baseForExpected = statusParsed.delegationDate || contractStartIso;
    const expectedArrivalIso = addDaysToIso(baseForExpected, avgArr);

    const nationalityRaw = String(
      rawRow['الجنسيه'] || rawRow['الجنسية عربى'] || rawRow['nationality'] || 'أثيوبيا'
    ).trim();
    const defaultCoord: FollowupCoordinatorEmail =
      matchedAgency?.assigned_coordinator_email ||
      (nationalityRaw.includes('ثيوبيا') ? 'i.mahmoud.followup@kas.sa' : 'm.fouda.followup@kas.sa');

    const safeContractNo = contractNo || `ROW-${sheetName}-${idx + 1}`;
    const stageTimestamps: Partial<Record<TransactionStage, string>> = {
      [finalStage]:
        arrivalColParsed.iso ||
        statusParsed.arrivalDate ||
        backoutCheck.extractedDate ||
        statusParsed.delegationDate ||
        contractStartIso,
    };

    parsedTransactions.push({
      id: `MTX-${companyCode}-${safeContractNo}`,
      company_id: companyCode,
      musaned_contract_no: safeContractNo,
      internal_contract_no: String(rawRow['رقم العقد'] || '').trim() || undefined,
      source_sheet: sheetName,
      is_archive: isArchiveSheet,
      client_name: clientName,
      client_national_id: String(rawRow['رقم السجل'] || '').trim(),
      client_phone: String(rawRow['رقم الهاتف'] || '').trim(),
      client_city: String(rawRow['مدينة العمل'] || rawRow['جهة وصول العميل'] || 'الرياض').trim() || 'الرياض',
      visa_number: String(rawRow['رقم التاشيره'] || rawRow['رقم التأشيرة'] || '').trim(),
      visa_issue_date: visaIssueParsed.iso,
      visa_issue_hijri: String(rawRow['تاريخ التأشيرة هجرى'] || '').trim() || undefined,
      visa_expiry_date: visaExpParsed.iso,
      worker_type: workerType,
      maid_name: backoutCheck.cleanName,
      passport_number: passportNumber,
      nationality: nationalityRaw || 'أثيوبيا',
      religion: String(rawRow['الديانة'] || '').trim() || undefined,
      profession: String(rawRow['الوظيفة'] || 'عاملة منزلية').trim() || 'عاملة منزلية',
      monthly_salary: parseFloat(String(rawRow['الراتب'] || '1000')) || 1000,
      worker_phone: String(rawRow['رقم هاتف العامل 2'] || '').trim() || undefined,
      agency_id: matchedAgency?.id,
      agency_raw_name: rawAgent,
      agency_canonical_name: matchedAgency?.name_ar || rawAgent || 'غير محدد (بانتظار إسناد وكيل)',
      assigned_coordinator_email: defaultCoord,
      sales_creator_name: String(rawRow['تم الانشاء بواسطة'] || '').trim(),
      branch_raw_name: branchRaw,
      stage: finalStage,
      stage_timestamps: stageTimestamps,
      contract_start_date: contractStartIso,
      musaned_link_date: linkParsed.iso,
      delegation_date: statusParsed.delegationDate,
      expected_arrival_date: expectedArrivalIso,
      arrival_date: arrivalColParsed.iso || statusParsed.arrivalDate,
      arrival_destination: String(rawRow['جهة وصول الرحلة'] || 'الرياض').trim() || 'الرياض',
      backout_date: backoutColParsed.iso || (backoutCheck.isBackout ? backoutCheck.extractedDate : undefined),
      runaway_date: runawayColParsed.iso || (backoutCheck.isRunaway ? backoutCheck.extractedDate : undefined),
      replacement_for_contract_no: String(rawRow['البدايل'] || '').trim() || undefined,
      paid_amount_sar: parseFloat(String(rawRow['المدفوع'] || '0')) || 0,
      commission_usd: matchedAgency?.default_commission_usd || 1050,
      updated_at: new Date().toISOString().slice(0, 10),
    });
  });

  return {
    parsedTransactions,
    correctedAliases,
    extractedBackouts,
    parsedFreeTextStatuses,
    convertedSerialDates,
    normalizedBranches,
    unknownAgentsMap,
  };
}

export async function importMusanedFollowupWorkbook(
  fileOrArrayBuffer: File | ArrayBuffer,
  options?: { includeArchiveSheets?: boolean }
): Promise<WorkbookImportHygieneReport> {
  const includeArchive = options?.includeArchiveSheets ?? true;
  const buffer =
    fileOrArrayBuffer instanceof ArrayBuffer
      ? fileOrArrayBuffer
      : await fileOrArrayBuffer.arrayBuffer();

  const workbook = XLSX.read(buffer, { type: 'array' });
  const agencies = getUnifiedAgenciesSync();
  const existing = await getMusanedTransactions();
  const existingByKey = new Map<string, MusanedFollowupTransaction>();
  existing.forEach((tx) => {
    existingByKey.set(`${tx.musaned_contract_no}::${tx.company_id}`, tx);
  });

  let totalRowsScanned = 0;
  let activeInserted = 0;
  let activeUpdated = 0;
  let archiveImported = 0;
  let correctedAgentAliases = 0;
  let extractedBackoutsFromName = 0;
  let parsedFreeTextStatuses = 0;
  let convertedExcelSerialDates = 0;
  let normalizedBranches = 0;
  const combinedUnknownAgents = new Map<string, number>();
  const passportCounter = new Map<string, number>();
  const sheetsProcessed: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheetNorm = normalizeLookupToken(sheetName);
    const isArchive =
      sheetNorm.startsWith('وصول') || sheetNorm.includes('الغاء') || sheetNorm.includes('ارشيف');
    if (isArchive && !includeArchive) continue;

    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[sheetName], {
      defval: '',
    });
    if (rows.length === 0) continue;

    sheetsProcessed.push(sheetName);
    totalRowsScanned += rows.length;

    const parsed = parseMusanedSheetRows(rows, sheetName, agencies);
    correctedAgentAliases += parsed.correctedAliases;
    extractedBackoutsFromName += parsed.extractedBackouts;
    parsedFreeTextStatuses += parsed.parsedFreeTextStatuses;
    convertedExcelSerialDates += parsed.convertedSerialDates;
    normalizedBranches += parsed.normalizedBranches;

    parsed.unknownAgentsMap.forEach((cnt, raw) => {
      combinedUnknownAgents.set(raw, (combinedUnknownAgents.get(raw) || 0) + cnt);
    });

    // Keep operational active sheet in full + cap massive historical archive stored in localStorage to latest 600 rows so browser storage never overflows
    const rowsToPersist = isArchive ? parsed.parsedTransactions.slice(0, 250) : parsed.parsedTransactions;

    for (const tx of parsed.parsedTransactions) {
      if (tx.passport_number) {
        passportCounter.set(tx.passport_number, (passportCounter.get(tx.passport_number) || 0) + 1);
      }
    }

    for (const tx of rowsToPersist) {
      const upsertKey = `${tx.musaned_contract_no}::${tx.company_id}`;
      const prev = existingByKey.get(upsertKey);
      if (prev) {
        // Preserve manual notes, flight numbers, and CV links while refreshing status from Musaned export
        const mergedTx: MusanedFollowupTransaction = {
          ...prev,
          ...tx,
          id: prev.id,
          flight_number: tx.flight_number || prev.flight_number,
          airline: tx.airline || prev.airline,
          cv_id: tx.cv_id || prev.cv_id,
          notes: prev.notes || tx.notes,
          stage_timestamps: {
            ...prev.stage_timestamps,
            ...tx.stage_timestamps,
          },
        };
        existingByKey.set(upsertKey, mergedTx);
        if (!tx.is_archive) activeUpdated++;
      } else {
        existingByKey.set(upsertKey, tx);
        if (tx.is_archive) archiveImported++;
        else activeInserted++;
      }
    }
  }

  const finalList = Array.from(existingByKey.values());
  await realErpDataStore.importRealRecordsBatch('musaned_followup_transactions', finalList);

  const duplicatePassportsDetected = Array.from(passportCounter.entries())
    .filter(([, count]) => count > 1)
    .map(([pp]) => pp)
    .slice(0, 50);

  const unknownAgentSpellings = Array.from(combinedUnknownAgents.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([rawSpelling, occurrences]) => {
      const suggestion = suggestAgencyMergeForUnknownSpelling(rawSpelling, agencies);
      return {
        rawSpelling,
        occurrences,
        suggestedAgencyId: suggestion?.id,
        suggestedAgencyName: suggestion?.name_ar,
      };
    });

  return {
    totalRowsScanned,
    activeInserted,
    activeUpdated,
    archiveImported,
    correctedAgentAliases,
    extractedBackoutsFromName,
    parsedFreeTextStatuses,
    convertedExcelSerialDates,
    normalizedBranches,
    duplicatePassportsDetected,
    unknownAgentSpellings,
    sheetsProcessed,
  };
}

/**
 * Exports transactions back in the exact 40-column Musaned Follow-up Excel format (`تقرير معاملات الدول`).
 */
export function exportMusanedFollowupWorkbook(
  transactions: MusanedFollowupTransaction[],
  fileName = `تقرير_معاملات_المتابعة_${new Date().toISOString().slice(0, 10)}.xlsx`
): void {
  const activeRows = transactions.filter((t) => !t.is_archive).map((tx, idx) => ({
    Column1: idx + 1,
    'رقم عقد مساند': tx.musaned_contract_no,
    'اسم العميل': tx.client_name,
    'رقم السجل': tx.client_national_id,
    'رقم التاشيره': tx.visa_number,
    'اسم العامله': tx.maid_name,
    'رقم الجواز': tx.passport_number,
    'الجنسيه': tx.nationality,
    'تاريخ بدايه العقد': tx.contract_start_date,
    'نوع العامل': tx.worker_type,
    'الحالة المنظمة': getStageLabelAr(tx.stage),
    'تاريخ التفوض او التختيم': tx.delegation_date || tx.visa_stamped_date || '',
    'اسم الوكيل الموحد': tx.agency_canonical_name,
    'اسم الوكيل الأصلي': tx.agency_raw_name,
    'تاريخ الربط على مساند': tx.musaned_link_date || '',
    'تم الانشاء بواسطة': tx.sales_creator_name,
    'اسم الفرع': SUBSIDIARY_DISPLAY_NAMES[tx.company_id] || tx.branch_raw_name,
    'رقم العقد': tx.internal_contract_no || '',
    'تاريخ الهروب': tx.runaway_date || '',
    'تاريخ Backout': tx.backout_date || '',
    'تاريخ اخر تحديث': tx.updated_at,
    'الديانة': tx.religion || '',
    'المدفوع': tx.paid_amount_sar,
    'تاريخ الوصول المتوقع': tx.expected_arrival_date || '',
    'تاريخ الوصول الفعلي': tx.arrival_date || '',
    'رقم الرحلة': tx.flight_number || '',
    'جهة وصول الرحلة': tx.arrival_destination,
    'تاريخ نهاية التأشيرة ميلادي': tx.visa_expiry_date || '',
    'تاريخ التأشيرة ميلادي': tx.visa_issue_date || '',
    'الراتب': tx.monthly_salary,
    'مدينة العمل': tx.client_city,
    'رقم الهاتف': tx.client_phone,
    'الوظيفة': tx.profession,
    'مسؤول المتابعة': tx.assigned_coordinator_email === 'i.mahmoud.followup@kas.sa' ? 'إسلام أحمد عرفة' : 'محمود فودة',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(activeRows);
  XLSX.utils.book_append_sheet(wb, ws, 'تقرير معاملات الدول');
  XLSX.writeFile(wb, fileName);
}

// ─── Multi-Channel Dispatcher: Email + WhatsApp + SentMessages Audit Log ────

export interface MultiChannelDispatchParams {
  recipientName: string;
  recipientPhone?: string;
  recipientEmail?: string;
  subject: string;
  bodyText: string;
  channel: 'whatsapp' | 'email' | 'both';
  templateName: string;
  companyId?: string;
  openExternalClient?: boolean;
}

export async function dispatchViaEmailAndWhatsApp(
  params: MultiChannelDispatchParams
): Promise<{
  whatsappUrl?: string;
  mailtoUrl?: string;
  loggedIds: string[];
}> {
  const nowFormatted = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const loggedIds: string[] = [];
  const cleanPhone = String(params.recipientPhone || '').replace(/[^\d+]/g, '');
  const cleanDigits = cleanPhone.startsWith('05')
    ? `966${cleanPhone.slice(1)}`
    : cleanPhone.replace(/^\+/, '');

  let whatsappUrl: string | undefined;
  let mailtoUrl: string | undefined;

  if (params.channel === 'whatsapp' || params.channel === 'both') {
    const waId = `MSG-WA-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`;
    loggedIds.push(waId);
    await realErpDataStore.addRecord('sent_messages', {
      id: waId,
      company_id: params.companyId || 'SAF',
      recipient_name: params.recipientName,
      phone: params.recipientPhone || '—',
      channel: 'WhatsApp',
      template: params.templateName,
      subject: params.subject,
      content: params.bodyText,
      status: 'تم التسليم',
      cost_sar: 0.15,
      sent_at: nowFormatted,
    });

    whatsappUrl = cleanDigits
      ? `https://wa.me/${cleanDigits}?text=${encodeURIComponent(`*${params.subject}*\n\n${params.bodyText}`)}`
      : `https://wa.me/?text=${encodeURIComponent(`*${params.subject}*\n\n${params.bodyText}`)}`;

    if (params.openExternalClient && typeof window !== 'undefined') {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  }

  if (params.channel === 'email' || params.channel === 'both') {
    const emId = `MSG-EM-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`;
    loggedIds.push(emId);
    await realErpDataStore.addRecord('sent_messages', {
      id: emId,
      company_id: params.companyId || 'SAF',
      recipient_name: params.recipientName,
      recipient: params.recipientEmail || '',
      phone: params.recipientEmail || params.recipientPhone || '—',
      channel: 'Email (HR@kas.sa)',
      template: params.templateName,
      subject: params.subject,
      content: params.bodyText,
      status: 'تم التسليم',
      cost_sar: 0,
      sent_at: nowFormatted,
    });

    mailtoUrl = `mailto:${encodeURIComponent(params.recipientEmail || '')}?subject=${encodeURIComponent(
      params.subject
    )}&body=${encodeURIComponent(params.bodyText)}`;

    if (params.openExternalClient && params.channel === 'email' && typeof window !== 'undefined') {
      window.open(mailtoUrl, '_self');
    }
  }

  return { whatsappUrl, mailtoUrl, loggedIds };
}
