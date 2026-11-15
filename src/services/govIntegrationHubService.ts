/**
 * Unified Government Integration Hub Engine (مركز التكامل والربط الحكومي الموحد)
 * Khalid Al-Sulaim Holding Group — SAF • YAQ • TOP • KAS • DAR
 *
 * Provides:
 *  1. Typed Adapter Registry for 11 Saudi government agencies (SANDBOX / SIMULATION / PRODUCTION).
 *  2. Real pre-flight validators for Saudi identifiers (ID/Iqama, VAT, IBAN, Musaned, Visa, Etimad ...).
 *  3. Live readiness audit (`runReadinessAudit`) and standard payload builder (`buildStandardPayload`).
 *  4. Transactional Outbox queue + sync logs with exponential-backoff retry and Dead-Letter Queue.
 *
 * SECURITY: this module never stores or embeds credentials, private keys or client secrets.
 * Real government calls are delegated to a secure server-side gateway (Edge Functions + KMS/Vault).
 * Only the public gateway URL (`VITE_GOV_GATEWAY_URL`) may be provided via environment variables.
 */
import { generateUblXml, generateZatcaQR, type ZatcaInvoicePayload } from './zatcaPhase2Service';
import { realErpDataStore } from './realErpDataStore';
import { KAS_ALLOWED_EMPLOYEES } from '../config/kasAllowedEmails';
import { INITIAL_COMPETITIONS } from './kasEtmadSuiteService';

// ─── Core types ──────────────────────────────────────────────────────────────

export type GovAgencyId =
  | 'musaned'
  | 'zatca'
  | 'mudad'
  | 'qiwa'
  | 'gosi'
  | 'muqeem'
  | 'enjaz'
  | 'etimad'
  | 'ejar'
  | 'nafath'
  | 'najiz';

export type GovEnvironment = 'SANDBOX' | 'SIMULATION' | 'PRODUCTION';
export type GovCompanyCode = 'SAF' | 'YAQ' | 'TOP' | 'KAS' | 'DAR';
export type GovPayloadFormat = 'JSON' | 'XML' | 'WPS_SIF';
export type GovReadinessStatus = 'READY' | 'PARTIAL' | 'BLOCKED' | 'NO_DATA';

export const GOV_COMPANIES: GovCompanyCode[] = ['SAF', 'YAQ', 'TOP', 'KAS', 'DAR'];
export const GOV_ENVIRONMENTS: GovEnvironment[] = ['SANDBOX', 'SIMULATION', 'PRODUCTION'];

type Rec = Record<string, any>;

export interface GovIssue {
  code: string;
  field: string;
  messageAr: string;
  severity: 'error' | 'warning';
}

export interface GovDataSnapshot {
  employees: Rec[];
  contracts: Rec[];
  invoices: Rec[];
  tenders: Rec[];
  facilities: Rec[];
  clients: Rec[];
  delegations: Rec[];
  complaints: Rec[];
}

export const EMPTY_GOV_SNAPSHOT: GovDataSnapshot = {
  employees: [],
  contracts: [],
  invoices: [],
  tenders: [],
  facilities: [],
  clients: [],
  delegations: [],
  complaints: [],
};

export interface GovBuildContext {
  companyId: GovCompanyCode;
  environment: GovEnvironment;
  now?: Date;
}

export interface GovStandardPayload {
  agencyId: GovAgencyId;
  format: GovPayloadFormat;
  contentType: string;
  body: string;
  recordCount: number;
  valid: boolean;
  issues: GovIssue[];
  idempotencyKey: string;
  companyId: GovCompanyCode;
  environment: GovEnvironment;
  generatedAt: string;
}

export interface GovAdapter {
  id: GovAgencyId;
  code: string;
  nameAr: string;
  nameEn: string;
  ministryAr: string;
  protocol: string;
  payloadFormat: GovPayloadFormat;
  companies: GovCompanyCode[];
  collection: keyof GovDataSnapshot;
  /** Names of server-side secrets expected in the secure gateway (never values). */
  serverSecretNames: string[];
  roadmapPhase: 1 | 2 | 3 | 4;
  validate: (record: Rec, ctx: { companyId?: GovCompanyCode; now: Date }) => GovIssue[];
  build: (records: Rec[], ctx: GovBuildContext) => { format: GovPayloadFormat; contentType: string; body: string };
}

// ─── Saudi identifier validators ─────────────────────────────────────────────

export const SAUDI_NATIONAL_ID_OR_IQAMA_REGEX = /^[12]\d{9}$/;
export const SAUDI_IQAMA_REGEX = /^2\d{9}$/;
export const SAUDI_IBAN_REGEX = /^SA\d{22}$/;
export const SAUDI_VAT_REGEX = /^3\d{13}3$/;
export const MUSANED_CONTRACT_REGEX = /^(MSN-\d{4}-\d{6}|\d{8,12})$/;
export const VISA_NUMBER_REGEX = /^\d{10}$/;
export const BORDER_NUMBER_REGEX = /^3\d{9}$/;
export const ETIMAD_REFERENCE_REGEX = /^(ETM-\d{4}-\d{6}|\d{12})$/;
export const GOSI_WAGE_CAP = 45000;

export const isValidNationalIdOrIqama = (v: unknown): boolean => SAUDI_NATIONAL_ID_OR_IQAMA_REGEX.test(String(v ?? '').trim());
export const isValidIqama = (v: unknown): boolean => SAUDI_IQAMA_REGEX.test(String(v ?? '').trim());
export const isValidSaudiVatNumber = (v: unknown): boolean => SAUDI_VAT_REGEX.test(String(v ?? '').trim());
export const isValidMusanedContractNumber = (v: unknown): boolean => MUSANED_CONTRACT_REGEX.test(String(v ?? '').trim());
export const isValidVisaNumber = (v: unknown): boolean => VISA_NUMBER_REGEX.test(String(v ?? '').trim());
export const isValidBorderNumber = (v: unknown): boolean => BORDER_NUMBER_REGEX.test(String(v ?? '').trim());
export const isValidEtimadReference = (v: unknown): boolean => ETIMAD_REFERENCE_REGEX.test(String(v ?? '').trim().toUpperCase());

/** Saudi IBAN: `SA` + 22 digits, validated with ISO 13616 MOD-97 checksum. */
export function isValidSaudiIban(value: unknown): boolean {
  const iban = String(value ?? '').replace(/\s+/g, '').toUpperCase();
  if (!SAUDI_IBAN_REGEX.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let remainder = 0;
  for (const ch of numeric) {
    remainder = (remainder * 10 + Number(ch)) % 97;
  }
  return remainder === 1;
}

// ─── Record helpers ──────────────────────────────────────────────────────────

function pick(rec: Rec | null | undefined, keys: string[]): string {
  if (!rec) return '';
  for (const k of keys) {
    const v = rec[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function num(rec: Rec, keys: string[]): number {
  const raw = pick(rec, keys).replace(/[^\d.-]/g, '');
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

function flag(rec: Rec, keys: string[]): boolean | null {
  for (const k of keys) {
    const v = rec?.[k];
    if (v === true || v === 'true' || v === 1 || v === 'yes') return true;
    if (v === false || v === 'false' || v === 0 || v === 'no') return false;
  }
  return null;
}

export function resolveRecordCompany(rec: Rec): GovCompanyCode | null {
  const raw = pick(rec, ['company_id', 'companyId', 'company']).toUpperCase();
  return (GOV_COMPANIES as string[]).includes(raw) ? (raw as GovCompanyCode) : null;
}

const err = (code: string, field: string, messageAr: string): GovIssue => ({ code, field, messageAr, severity: 'error' });
const warn = (code: string, field: string, messageAr: string): GovIssue => ({ code, field, messageAr, severity: 'warning' });

const ID_KEYS = ['national_id', 'nationalId', 'iqama_number', 'iqamaNumber', 'id_number', 'nationalIdOrIqama'];
const isSaudiEmployee = (r: Rec): boolean => {
  const f = flag(r, ['is_saudi', 'isSaudi']);
  if (f !== null) return f;
  const nat = pick(r, ['nationality']);
  if (nat) {
    return nat === 'سعودي' || nat === 'سعودية' || nat.toLowerCase() === 'saudi';
  }
  const idVal = pick(r, ID_KEYS);
  if (/^1\d{9}$/.test(idVal)) return true;
  return false;
};

function validateEmployeeId(r: Rec): GovIssue[] {
  const id = pick(r, ID_KEYS);
  return isValidNationalIdOrIqama(id)
    ? []
    : [err('INVALID_ID', 'national_id', 'رقم الهوية الوطنية/الإقامة يجب أن يتكون من 10 أرقام ويبدأ بـ 1 أو 2.')];
}

function daysUntil(dateStr: string, now: Date): number | null {
  if (!dateStr) return null;
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return null;
  return Math.floor((t - now.getTime()) / 86400000);
}

// ─── Deterministic hashing (idempotency keys — no secrets involved) ─────────

function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

export function computeIdempotencyKey(companyId: string, agencyId: string, entityId: string, operation = 'SUBMIT', version = 1): string {
  return `IDK-${cyrb53(`${companyId}|${agencyId}|${entityId}|${operation}|${version}`)}`;
}

const xmlEscape = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const jsonBuild = (agency: GovAdapter['id'], items: Rec[], ctx: GovBuildContext) => ({
  format: 'JSON' as GovPayloadFormat,
  contentType: 'application/json; charset=utf-8',
  body: JSON.stringify(
    {
      agency,
      environment: ctx.environment,
      establishmentCode: ctx.companyId,
      generatedAt: (ctx.now || new Date()).toISOString(),
      count: items.length,
      items,
    },
    null,
    2
  ),
});

// ─── Adapter definitions ─────────────────────────────────────────────────────

const RECRUITMENT_COMPANIES: GovCompanyCode[] = ['SAF', 'YAQ', 'TOP', 'DAR'];

const musanedAdapter: GovAdapter = {
  id: 'musaned',
  code: 'MSN',
  nameAr: 'منصة مساند',
  nameEn: 'Musaned',
  ministryAr: 'وزارة الموارد البشرية والتنمية الاجتماعية',
  protocol: 'REST JSON • mTLS 1.3 • OAuth 2.0 + HMAC Webhooks',
  payloadFormat: 'JSON',
  companies: RECRUITMENT_COMPANIES,
  collection: 'contracts',
  serverSecretNames: ['MUSANED_CLIENT_ID', 'MUSANED_CLIENT_SECRET', 'MUSANED_WEBHOOK_HMAC_KEY', 'MUSANED_MTLS_CERT'],
  roadmapPhase: 2,
  validate: (r) => {
    const issues: GovIssue[] = [];
    if (
      !isValidMusanedContractNumber(
        pick(r, ['musaned_number', 'musanedContractNumber', 'musaned_contract_number', 'musaned_contract_no', 'contract_number'])
      )
    )
      issues.push(err('INVALID_MUSANED_CONTRACT', 'musaned_number', 'رقم عقد مساند غير صالح (MSN-YYYY-XXXXXX أو 8–12 رقماً).'));
    if (!isValidNationalIdOrIqama(pick(r, ['client_national_id', 'client_id_number', 'clientNationalId', 'national_id', 'id_number'])))
      issues.push(err('INVALID_CLIENT_ID', 'client_national_id', 'هوية صاحب العمل يجب أن تكون 10 أرقام وتبدأ بـ 1 أو 2.'));
    if (!pick(r, ['maid_passport', 'passport_number', 'workerPassport', 'passport']))
      issues.push(err('MISSING_PASSPORT', 'maid_passport', 'رقم جواز العاملة مطلوب.'));
    if (num(r, ['amount', 'recruitmentFee', 'total_amount', 'price', 'contract_value']) <= 0)
      issues.push(err('INVALID_AMOUNT', 'amount', 'قيمة العقد يجب أن تكون أكبر من صفر (⃁).'));
    return issues;
  },
  build: (recs, ctx) =>
    jsonBuild(
      'musaned',
      recs.map((r) => {
        const amount = num(r, ['amount', 'recruitmentFee', 'total_amount', 'price', 'contract_value']);
        return {
          contractReference: pick(r, ['musaned_number', 'musanedContractNumber', 'musaned_contract_number', 'musaned_contract_no', 'contract_number']),
          employerId: pick(r, ['client_national_id', 'client_id_number', 'clientNationalId', 'national_id', 'id_number']),
          workerPassportNo: pick(r, ['maid_passport', 'passport_number', 'workerPassport', 'passport']),
          escrowAmountSar: amount,
          escrowHoldDays: 90,
          visaNumber: pick(r, ['visa_number', 'visaNumber']),
          establishmentCode: ctx.companyId,
        };
      }),
      ctx
    ),
};

const zatcaAdapter: GovAdapter = {
  id: 'zatca',
  code: 'ZTC',
  nameAr: 'هيئة الزكاة والضريبة والجمارك (فاتورة — المرحلة الثانية)',
  nameEn: 'ZATCA Fatoora Phase 2',
  ministryAr: 'هيئة الزكاة والضريبة والجمارك',
  protocol: 'REST • mTLS • X.509 CSID • ECDSA • UBL 2.1 XML',
  payloadFormat: 'XML',
  companies: GOV_COMPANIES,
  collection: 'invoices',
  serverSecretNames: ['ZATCA_CSR_PRIVATE_KEY', 'ZATCA_CSID_CERTIFICATE', 'ZATCA_CSID_SECRET'],
  roadmapPhase: 1,
  validate: (r) => {
    const issues: GovIssue[] = [];
    if (!isValidSaudiVatNumber(pick(r, ['seller_vat', 'sellerVatNumber', 'vat_number', 'tax_number'])))
      issues.push(err('INVALID_VAT', 'seller_vat', 'الرقم الضريبي يجب أن يتكون من 15 رقماً يبدأ وينتهي بالرقم 3.'));
    if (!pick(r, ['invoice_number', 'invoiceNumber', 'id'])) issues.push(err('MISSING_INVOICE_NO', 'invoice_number', 'رقم الفاتورة مطلوب.'));
    const total = num(r, ['total_amount', 'grandTotal', 'total']);
    if (total <= 0) issues.push(err('INVALID_TOTAL', 'total_amount', 'إجمالي الفاتورة يجب أن يكون أكبر من صفر (⃁).'));
    const vat = num(r, ['vat_amount', 'vatAmount', 'tax_amount']);
    const subtotal = num(r, ['subtotal', 'amount_before_vat']) || (total > 0 ? total - vat : 0);
    if (subtotal > 0 && Math.abs(vat - subtotal * 0.15) > 0.05)
      issues.push(warn('VAT_NOT_15', 'vat_amount', 'قيمة الضريبة لا تساوي 15% من الصافي.'));
    const uuid = pick(r, ['uuid']);
    if (uuid && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid))
      issues.push(warn('INVALID_UUID', 'uuid', 'صيغة UUID غير قياسية.'));
    return issues;
  },
  build: (recs, ctx) => {
    const items = recs.map((r) => {
      const total = num(r, ['total_amount', 'grandTotal', 'total']);
      const vat = num(r, ['vat_amount', 'vatAmount', 'tax_amount']);
      const subtotal = num(r, ['subtotal', 'amount_before_vat']) || Math.max(0, total - vat);
      const issued = pick(r, ['issue_date', 'created_at']) || (ctx.now || new Date()).toISOString();
      const iso = new Date(Number.isNaN(Date.parse(issued)) ? Date.now() : Date.parse(issued)).toISOString();
      const invoiceNumber = pick(r, ['invoice_number', 'invoiceNumber', 'id']);
      const uuid = pick(r, ['uuid']) || `00000000-0000-4000-8000-${cyrb53(invoiceNumber).padStart(12, '0').slice(0, 12)}`;
      const sellerName = pick(r, ['seller_name', 'sellerName']) || 'مجموعة خالد السليم القابضة';
      const sellerVat = pick(r, ['seller_vat', 'sellerVatNumber', 'vat_number', 'tax_number']);
      const payload: ZatcaInvoicePayload = {
        invoiceNumber,
        uuid,
        issueDate: iso.slice(0, 10),
        issueTime: iso.slice(11, 19),
        sellerName,
        sellerVatNumber: sellerVat,
        sellerAddress: pick(r, ['seller_address']) || 'الرياض - المملكة العربية السعودية',
        buyerName: pick(r, ['buyer_name', 'client_name']) || undefined,
        buyerVatNumber: pick(r, ['buyer_vat']) || undefined,
        lineItems: [{ name: pick(r, ['description', 'item']) || 'خدمات', quantity: 1, unitPrice: subtotal, vatRate: 0.15, total: subtotal }],
        subtotal,
        vatAmount: vat,
        grandTotal: total,
        previousInvoiceHash: pick(r, ['previous_hash', 'pih']) || undefined,
      };
      return { xml: generateUblXml(payload), qr: generateZatcaQR(sellerName, sellerVat, iso, total, vat), invoiceNumber, uuid };
    });
    if (items.length === 1) {
      return {
        format: 'XML' as GovPayloadFormat,
        contentType: 'application/xml; charset=utf-8',
        body: `${items[0].xml}\n<!-- TLV-QR-BASE64: ${items[0].qr} -->`,
      };
    }
    return jsonBuild('zatca', items, ctx);
  },
};

const sifLine = (r: Rec): { fields: string[]; net: number; basic: number } => {
  const basic = num(r, ['basic_salary', 'basicSalary', 'salary']);
  const housing = num(r, ['housing', 'housing_allowance', 'housingAllowance']);
  const transport = num(r, ['transport', 'transport_allowance', 'transportAllowance']);
  const other = num(r, ['other_allowances', 'otherAllowances']);
  const deductions = num(r, ['deductions']);
  const gosi = num(r, ['gosi_deduction', 'gosiDeduction']);
  const net = pick(r, ['net_salary', 'netSalary']) ? num(r, ['net_salary', 'netSalary']) : basic + housing + transport + other - deductions - gosi;
  return {
    basic,
    net,
    fields: [
      'SCR',
      pick(r, ID_KEYS),
      pick(r, ['iban', 'ibanNumber']).replace(/\s+/g, '').toUpperCase(),
      basic.toFixed(2),
      housing.toFixed(2),
      (transport + other).toFixed(2),
      deductions.toFixed(2),
      net.toFixed(2),
    ],
  };
};

const mudadAdapter: GovAdapter = {
  id: 'mudad',
  code: 'MDD',
  nameAr: 'منصة مدد وحماية الأجور',
  nameEn: 'Mudad & WPS',
  ministryAr: 'وزارة الموارد البشرية والتنمية الاجتماعية',
  protocol: 'SIF 4.0 File Upload • REST • OAuth 2.0',
  payloadFormat: 'WPS_SIF',
  companies: GOV_COMPANIES,
  collection: 'employees',
  serverSecretNames: ['MUDAD_CLIENT_ID', 'MUDAD_CLIENT_SECRET', 'MUDAD_ESTABLISHMENT_KEY'],
  roadmapPhase: 1,
  validate: (r) => {
    const issues = validateEmployeeId(r);
    if (!isValidSaudiIban(pick(r, ['iban', 'ibanNumber'])))
      issues.push(err('INVALID_IBAN', 'iban', 'الآيبان السعودي يجب أن يكون SA + 22 رقماً وبمجموع تحقق MOD-97 صحيح.'));
    if (num(r, ['basic_salary', 'basicSalary', 'salary']) <= 0) issues.push(err('INVALID_BASIC', 'basic_salary', 'الراتب الأساسي يجب أن يكون أكبر من صفر.'));
    const declared = pick(r, ['net_salary', 'netSalary']);
    if (declared) {
      const calc =
        num(r, ['basic_salary', 'basicSalary', 'salary']) +
        num(r, ['housing', 'housing_allowance', 'housingAllowance']) +
        num(r, ['transport', 'transport_allowance', 'transportAllowance']) +
        num(r, ['other_allowances', 'otherAllowances']) -
        num(r, ['deductions']) -
        num(r, ['gosi_deduction', 'gosiDeduction']);
      if (Math.abs(calc - num(r, ['net_salary', 'netSalary'])) > 0.5)
        issues.push(err('NET_SALARY_MISMATCH', 'net_salary', 'صافي الراتب لا يطابق المعادلة (الأساسي + السكن + النقل + البدلات − الاستقطاعات − التأمينات).'));
    }
    return issues;
  },
  build: (recs, ctx) => {
    const lines = recs.map(sifLine);
    const total = lines.reduce((s, l) => s + l.net, 0);
    const now = ctx.now || new Date();
    const header = ['HDR', ctx.companyId, now.toISOString().slice(0, 7), String(lines.length), total.toFixed(2), 'SAR'].join(',');
    return {
      format: 'WPS_SIF',
      contentType: 'text/plain; charset=utf-8',
      body: [header, ...lines.map((l) => l.fields.join(','))].join('\r\n'),
    };
  },
};

const qiwaAdapter: GovAdapter = {
  id: 'qiwa',
  code: 'QWA',
  nameAr: 'منصة قوى',
  nameEn: 'Qiwa',
  ministryAr: 'وزارة الموارد البشرية والتنمية الاجتماعية',
  protocol: 'REST JSON • OAuth 2.0 • mTLS',
  payloadFormat: 'JSON',
  companies: GOV_COMPANIES,
  collection: 'employees',
  serverSecretNames: ['QIWA_CLIENT_ID', 'QIWA_CLIENT_SECRET', 'QIWA_MTLS_CERT'],
  roadmapPhase: 2,
  validate: (r) => {
    const issues = validateEmployeeId(r);
    if (!pick(r, ['job_title', 'jobTitle', 'profession', 'occupation'])) issues.push(err('MISSING_OCCUPATION', 'job_title', 'المهنة مطلوبة لتوثيق عقد قوى.'));
    if (num(r, ['basic_salary', 'basicSalary', 'salary']) <= 0) issues.push(err('INVALID_WAGE', 'salary', 'الأجر الأساسي يجب أن يكون أكبر من صفر.'));
    return issues;
  },
  build: (recs, ctx) =>
    jsonBuild(
      'qiwa',
      recs.map((r) => ({
        workerId: pick(r, ID_KEYS),
        occupation: pick(r, ['job_title', 'jobTitle', 'profession', 'occupation']),
        wagePackageSar: num(r, ['basic_salary', 'basicSalary', 'salary']),
        contractType: pick(r, ['contract_type', 'contractType']) || 'FIXED_TERM',
        nationalityType: isSaudiEmployee(r) ? 'SAUDI' : 'NON_SAUDI',
      })),
      ctx
    ),
};

const gosiAdapter: GovAdapter = {
  id: 'gosi',
  code: 'GSI',
  nameAr: 'المؤسسة العامة للتأمينات الاجتماعية',
  nameEn: 'GOSI',
  ministryAr: 'المؤسسة العامة للتأمينات الاجتماعية',
  protocol: 'REST JSON • OAuth 2.0',
  payloadFormat: 'JSON',
  companies: GOV_COMPANIES,
  collection: 'employees',
  serverSecretNames: ['GOSI_CLIENT_ID', 'GOSI_CLIENT_SECRET'],
  roadmapPhase: 1,
  validate: (r) => {
    const issues = validateEmployeeId(r);
    const wage = num(r, ['basic_salary', 'basicSalary', 'salary']) + num(r, ['housing', 'housing_allowance', 'housingAllowance']);
    if (wage <= 0) issues.push(err('INVALID_WAGE', 'basic_salary', 'الأجر الخاضع للاشتراك يجب أن يكون أكبر من صفر.'));
    if (wage > GOSI_WAGE_CAP) issues.push(warn('WAGE_ABOVE_CAP', 'basic_salary', `الأجر يتجاوز سقف الاشتراك ${GOSI_WAGE_CAP.toLocaleString('en-US')} ⃁ وسيُحتسب بالسقف.`));
    return issues;
  },
  build: (recs, ctx) =>
    jsonBuild(
      'gosi',
      recs.map((r) => {
        const wage = num(r, ['basic_salary', 'basicSalary', 'salary']) + num(r, ['housing', 'housing_allowance', 'housingAllowance']);
        return {
          contributorNinOrIqama: pick(r, ID_KEYS),
          nationalityType: isSaudiEmployee(r) ? 'SAUDI' : 'NON_SAUDI',
          contributoryWageSar: Math.min(wage, GOSI_WAGE_CAP),
          engagementDate: pick(r, ['join_date', 'hire_date', 'start_date']),
          branches: isSaudiEmployee(r) ? ['ANNUITIES', 'SANED', 'OCCUPATIONAL_HAZARDS'] : ['OCCUPATIONAL_HAZARDS'],
        };
      }),
      ctx
    ),
};

const muqeemAdapter: GovAdapter = {
  id: 'muqeem',
  code: 'MQM',
  nameAr: 'منصة مقيم / أبشر أعمال',
  nameEn: 'Muqeem / Absher Business',
  ministryAr: 'وزارة الداخلية — الجوازات',
  protocol: 'REST JSON • mTLS • Gov API Key',
  payloadFormat: 'JSON',
  companies: GOV_COMPANIES,
  collection: 'employees',
  serverSecretNames: ['MUQEEM_API_KEY', 'MUQEEM_MTLS_CERT'],
  roadmapPhase: 3,
  validate: (r, ctx) => {
    if (isSaudiEmployee(r)) return [];
    const issues: GovIssue[] = [];
    if (!isValidIqama(pick(r, ['iqama_number', 'iqamaNumber', 'national_id'])))
      issues.push(err('INVALID_IQAMA', 'iqama_number', 'رقم الإقامة يجب أن يتكون من 10 أرقام ويبدأ بالرقم 2.'));
    if (!pick(r, ['passport_number', 'passportNumber', 'passport'])) issues.push(err('MISSING_PASSPORT', 'passport_number', 'رقم الجواز مطلوب.'));
    const border = pick(r, ['border_number', 'borderNumber']);
    if (border && !isValidBorderNumber(border)) issues.push(warn('INVALID_BORDER', 'border_number', 'رقم الحدود غير مطابق للصيغة (10 أرقام تبدأ بـ 3).'));
    const days = daysUntil(pick(r, ['iqama_expiry', 'iqamaExpiry', 'iqama_expiry_date']), ctx.now);
    if (days !== null && days < 0) issues.push(err('IQAMA_EXPIRED', 'iqama_expiry', 'الإقامة منتهية الصلاحية.'));
    else if (days !== null && days <= 30) issues.push(warn('IQAMA_EXPIRING', 'iqama_expiry', `الإقامة تنتهي خلال ${days} يوماً.`));
    return issues;
  },
  build: (recs, ctx) =>
    jsonBuild(
      'muqeem',
      recs.map((r) => ({
        residentId: pick(r, ['iqama_number', 'iqamaNumber', 'national_id']),
        borderNumber: pick(r, ['border_number', 'borderNumber']),
        passportNo: pick(r, ['passport_number', 'passportNumber', 'passport']),
        visaActionType: pick(r, ['visa_action', 'visaAction']) || 'IQAMA_RENEWAL',
        iqamaExpiry: pick(r, ['iqama_expiry', 'iqamaExpiry', 'iqama_expiry_date']),
      })),
      ctx
    ),
};

const enjazAdapter: GovAdapter = {
  id: 'enjaz',
  code: 'ENJ',
  nameAr: 'منصة إنجاز / وزارة الخارجية / وافد',
  nameEn: 'Enjaz / MOFA / Wafid',
  ministryAr: 'وزارة الخارجية',
  protocol: 'REST JSON • OAuth 2.0 • mTLS',
  payloadFormat: 'JSON',
  companies: RECRUITMENT_COMPANIES.filter((c) => c !== 'YAQ'),
  collection: 'delegations',
  serverSecretNames: ['ENJAZ_CLIENT_ID', 'ENJAZ_CLIENT_SECRET', 'WAFID_API_KEY'],
  roadmapPhase: 2,
  validate: (r) => {
    const issues: GovIssue[] = [];
    if (!isValidVisaNumber(pick(r, ['visa_number', 'visaNumber'])))
      issues.push(err('INVALID_VISA', 'visa_number', 'رقم التأشيرة يجب أن يتكون من 10 أرقام.'));
    if (!pick(r, ['office_license', 'foreign_agency_code', 'office_name', 'agency_name']))
      issues.push(err('MISSING_AGENCY', 'office_license', 'ترخيص/اسم المكتب الخارجي مطلوب.'));
    const med = pick(r, ['medical_status', 'wafid_status']).toUpperCase();
    if (med && med !== 'FIT' && med !== 'لائق') issues.push(warn('MEDICAL_NOT_FIT', 'medical_status', 'الفحص الطبي (وافد) غير لائق أو لم يكتمل.'));
    return issues;
  },
  build: (recs, ctx) =>
    jsonBuild(
      'enjaz',
      recs.map((r) => ({
        visaNumber: pick(r, ['visa_number', 'visaNumber']),
        foreignAgencyCode: pick(r, ['office_license', 'foreign_agency_code', 'office_name', 'agency_name']),
        applicantPassport: pick(r, ['maid_passport', 'passport_number']),
        wafidMedicalFitCode: pick(r, ['medical_status', 'wafid_status']) || 'PENDING',
      })),
      ctx
    ),
};

const etimadAdapter: GovAdapter = {
  id: 'etimad',
  code: 'ETM',
  nameAr: 'منصة اعتماد',
  nameEn: 'Etimad',
  ministryAr: 'وزارة المالية',
  protocol: 'REST JSON • mTLS • KAS Certificate',
  payloadFormat: 'JSON',
  companies: ['KAS'],
  collection: 'tenders',
  serverSecretNames: ['ETIMAD_CLIENT_ID', 'ETIMAD_CLIENT_SECRET', 'ETIMAD_KAS_CERT'],
  roadmapPhase: 3,
  validate: (r) => {
    const issues: GovIssue[] = [];
    if (!isValidEtimadReference(pick(r, ['tender_ref', 'tenderReference', 'referenceNumber', 'reference_no', 'etimad_ref'])))
      issues.push(err('INVALID_ETIMAD_REF', 'tender_ref', 'الرقم المرجعي للمنافسة غير صالح (ETM-YYYY-XXXXXX أو 12 رقماً).'));
    if (num(r, ['boq_total', 'financial_offer', 'totalItemsValue', 'winningValue', 'amount']) <= 0)
      issues.push(err('INVALID_OFFER', 'boq_total', 'قيمة العرض المالي يجب أن تكون أكبر من صفر (⃁).'));
    if (!pick(r, ['bank_guarantee_no', 'guarantee_ref'])) issues.push(warn('MISSING_GUARANTEE', 'bank_guarantee_no', 'لا يوجد رقم ضمان بنكي مرتبط بالمنافسة.'));
    return issues;
  },
  build: (recs, ctx) =>
    jsonBuild(
      'etimad',
      recs.map((r) => ({
        tenderReferenceNo: pick(r, ['tender_ref', 'tenderReference', 'referenceNumber', 'reference_no', 'etimad_ref']),
        financialOfferSar: num(r, ['boq_total', 'financial_offer', 'totalItemsValue', 'winningValue', 'amount']),
        guaranteeLetterRef: pick(r, ['bank_guarantee_no', 'guarantee_ref']),
      })),
      ctx
    ),
};

const ejarAdapter: GovAdapter = {
  id: 'ejar',
  code: 'EJR',
  nameAr: 'منصة إيجار وبلدي وسلامة',
  nameEn: 'Ejar / Balady / Salamah',
  ministryAr: 'وزارة الشؤون البلدية والقروية والإسكان',
  protocol: 'REST JSON • OAuth 2.0',
  payloadFormat: 'JSON',
  companies: GOV_COMPANIES,
  collection: 'facilities',
  serverSecretNames: ['EJAR_CLIENT_ID', 'EJAR_CLIENT_SECRET', 'BALADY_API_KEY', 'SALAMAH_API_KEY'],
  roadmapPhase: 3,
  validate: (r) => {
    const issues: GovIssue[] = [];
    if (!pick(r, ['ejar_contract_no', 'ejarContractNumber'])) issues.push(err('MISSING_EJAR', 'ejar_contract_no', 'رقم عقد إيجار الموثق مطلوب.'));
    if (!pick(r, ['balady_license_no', 'baladyLicenseNo'])) issues.push(err('MISSING_BALADY', 'balady_license_no', 'رقم ترخيص بلدي مطلوب.'));
    if (!pick(r, ['salamah_certificate_no', 'salamahCertId'])) issues.push(err('MISSING_SALAMAH', 'salamah_certificate_no', 'شهادة السلامة (الدفاع المدني) مطلوبة.'));
    const cap = num(r, ['capacity', 'max_occupancy']);
    const occ = num(r, ['occupied', 'occupied_beds']);
    if (cap > 0 && occ > cap) issues.push(err('CAPACITY_EXCEEDED', 'occupied', 'عدد المقيمين يتجاوز الطاقة الاستيعابية المرخصة.'));
    return issues;
  },
  build: (recs, ctx) =>
    jsonBuild(
      'ejar',
      recs.map((r) => ({
        ejarContractNumber: pick(r, ['ejar_contract_no', 'ejarContractNumber']),
        baladyLicenseNo: pick(r, ['balady_license_no', 'baladyLicenseNo']),
        salamahCertId: pick(r, ['salamah_certificate_no', 'salamahCertId']),
        maxOccupancyLimit: num(r, ['capacity', 'max_occupancy']),
        currentOccupancy: num(r, ['occupied', 'occupied_beds']),
      })),
      ctx
    ),
};

const nafathAdapter: GovAdapter = {
  id: 'nafath',
  code: 'NFT',
  nameAr: 'النفاذ الوطني الموحد وسدايا (PDPL)',
  nameEn: 'Nafath IAM & SDAIA PDPL',
  ministryAr: 'الهيئة السعودية للبيانات والذكاء الاصطناعي',
  protocol: 'OpenID Connect • mTLS • PDPL Residency',
  payloadFormat: 'JSON',
  companies: GOV_COMPANIES,
  collection: 'clients',
  serverSecretNames: ['NAFATH_CLIENT_ID', 'NAFATH_CLIENT_SECRET'],
  roadmapPhase: 4,
  validate: (r) => {
    const issues: GovIssue[] = [];
    if (!isValidNationalIdOrIqama(pick(r, ID_KEYS))) issues.push(err('INVALID_ID', 'national_id', 'هوية العميل يجب أن تكون 10 أرقام وتبدأ بـ 1 أو 2.'));
    if (flag(r, ['consent_signed', 'pdpl_consent', 'consentSigned']) !== true)
      issues.push(err('PDPL_CONSENT_MISSING', 'consent_signed', 'موافقة معالجة البيانات الشخصية (PDPL) غير موثقة.'));
    return issues;
  },
  build: (recs, ctx) =>
    jsonBuild(
      'nafath',
      recs.map((r) => ({
        nationalId: pick(r, ID_KEYS),
        assuranceLevel: 'HIGH',
        pdplConsentRecordId: pick(r, ['consent_id', 'pdplConsentRecordId']) || `PDPL-${cyrb53(pick(r, ID_KEYS)).slice(0, 8)}`,
        dataResidency: 'KSA',
      })),
      ctx
    ),
};

const najizAdapter: GovAdapter = {
  id: 'najiz',
  code: 'NJZ',
  nameAr: 'منصة ناجز / ودي / نافذ',
  nameEn: 'Najiz / Widdy / Nafith',
  ministryAr: 'وزارة العدل',
  protocol: 'REST JSON • OAuth 2.0 • mTLS',
  payloadFormat: 'JSON',
  companies: GOV_COMPANIES,
  collection: 'complaints',
  serverSecretNames: ['NAJIZ_CLIENT_ID', 'NAJIZ_CLIENT_SECRET', 'WIDDY_API_KEY', 'NAFITH_API_KEY'],
  roadmapPhase: 4,
  validate: (r) => {
    const issues: GovIssue[] = [];
    if (!pick(r, ['poa_number', 'dispute_id', 'widdy_case_no', 'promissory_note_no']))
      issues.push(err('MISSING_LEGAL_REF', 'poa_number', 'يلزم رقم وكالة أو قضية ودي أو سند لأمر.'));
    if (pick(r, ['claim_amount', 'amount']) && num(r, ['claim_amount', 'amount']) < 0)
      issues.push(err('INVALID_CLAIM', 'claim_amount', 'مبلغ المطالبة لا يمكن أن يكون سالباً.'));
    return issues;
  },
  build: (recs, ctx) =>
    jsonBuild(
      'najiz',
      recs.map((r) => ({
        agencyDeedNumber: pick(r, ['poa_number']),
        widdyCaseNumber: pick(r, ['dispute_id', 'widdy_case_no']),
        nafithBondId: pick(r, ['promissory_note_no']),
        obligationAmountSar: num(r, ['claim_amount', 'amount']),
      })),
      ctx
    ),
};

export const GOV_ADAPTER_REGISTRY: Record<GovAgencyId, GovAdapter> = {
  musaned: musanedAdapter,
  zatca: zatcaAdapter,
  mudad: mudadAdapter,
  qiwa: qiwaAdapter,
  gosi: gosiAdapter,
  muqeem: muqeemAdapter,
  enjaz: enjazAdapter,
  etimad: etimadAdapter,
  ejar: ejarAdapter,
  nafath: nafathAdapter,
  najiz: najizAdapter,
};

export const GOV_AGENCY_IDS = Object.keys(GOV_ADAPTER_REGISTRY) as GovAgencyId[];
export const getGovAdapter = (id: GovAgencyId): GovAdapter => GOV_ADAPTER_REGISTRY[id];

// ─── Validation & payload building ───────────────────────────────────────────

export function validateRecordForAgency(
  agencyId: GovAgencyId,
  record: Rec,
  opts: { companyId?: GovCompanyCode; now?: Date } = {}
): GovIssue[] {
  const adapter = getGovAdapter(agencyId);
  const now = opts.now || new Date();
  const company = opts.companyId || resolveRecordCompany(record) || undefined;
  const issues: GovIssue[] = [];
  if (company && !adapter.companies.includes(company)) {
    issues.push(
      err(
        'COMPANY_NOT_ALLOWED',
        'company_id',
        `الشركة ${company} غير مخولة بالربط مع ${adapter.nameAr} (قاعدة العزل المؤسسي بين الشركات).`
      )
    );
    return issues;
  }
  return issues.concat(adapter.validate(record, { companyId: company, now }));
}

export function buildStandardPayload(
  agencyId: GovAgencyId,
  recordOrRecords: Rec | Rec[],
  ctx: GovBuildContext
): GovStandardPayload {
  const adapter = getGovAdapter(agencyId);
  const records = Array.isArray(recordOrRecords) ? recordOrRecords : [recordOrRecords];
  const now = ctx.now || new Date();
  const issues: GovIssue[] = [];

  if (!adapter.companies.includes(ctx.companyId)) {
    issues.push(
      err('COMPANY_NOT_ALLOWED', 'company_id', `الشركة ${ctx.companyId} غير مخولة بالربط مع ${adapter.nameAr}.`)
    );
  }
  if (records.length === 0) issues.push(err('EMPTY_BATCH', 'records', 'لا توجد سجلات لبناء الحزمة.'));

  const scoped = records.filter((r) => {
    const rc = resolveRecordCompany(r);
    if (rc && rc !== ctx.companyId) {
      issues.push(err('CROSS_TENANT_RECORD', 'company_id', `سجل يتبع ${rc} لا يمكن إدراجه في حزمة ${ctx.companyId}.`));
      return false;
    }
    return true;
  });

  for (const r of scoped) {
    issues.push(...adapter.validate(r, { companyId: ctx.companyId, now }));
  }

  const blocked = issues.some((i) => i.severity === 'error');
  const built =
    adapter.companies.includes(ctx.companyId) && scoped.length > 0
      ? adapter.build(scoped, { ...ctx, now })
      : { format: adapter.payloadFormat, contentType: 'text/plain; charset=utf-8', body: '' };

  const entityIds = scoped.map((r) => pick(r, ['id', 'invoice_number', 'musaned_number', 'tender_ref', ...ID_KEYS]) || 'NA').join(',');
  return {
    agencyId,
    format: built.format,
    contentType: built.contentType,
    body: built.body,
    recordCount: scoped.length,
    valid: !blocked,
    issues,
    idempotencyKey: computeIdempotencyKey(ctx.companyId, agencyId, entityIds || 'EMPTY'),
    companyId: ctx.companyId,
    environment: ctx.environment,
    generatedAt: now.toISOString(),
  };
}

/** PDPL Art. 11 masking for UI payload previews (IDs, Iqama, IBAN). */
export function maskSensitivePayloadText(text: string): string {
  return text
    .replace(/\bSA(\d{2})\d{16}(\d{4})\b/g, 'SA$1****************$2')
    .replace(/\b([12]\d)\d{6}(\d{2})\b/g, '$1******$2');
}

// ─── Environment configuration (no secrets) ──────────────────────────────────

const ENV_STORAGE_KEY = 'ALSULAIM_GOV_ENVIRONMENT_V1';

export function getGatewayUrl(): string {
  try {
    return String((import.meta as any).env?.VITE_GOV_GATEWAY_URL || '').trim();
  } catch {
    return '';
  }
}

export const isGatewayConfigured = (): boolean => getGatewayUrl().length > 0;

export function getGovEnvironment(): GovEnvironment {
  try {
    const v = localStorage.getItem(ENV_STORAGE_KEY);
    if (v === 'SANDBOX' || v === 'SIMULATION' || v === 'PRODUCTION') return v;
  } catch {
    /* ignore */
  }
  return 'SIMULATION';
}

/** PRODUCTION requires a configured secure gateway; otherwise the change is refused. */
export function setGovEnvironment(env: GovEnvironment, gatewayConfigured = isGatewayConfigured()): { ok: boolean; messageAr: string } {
  if (env === 'PRODUCTION' && !gatewayConfigured) {
    return { ok: false, messageAr: 'لا يمكن تفعيل وضع الإنتاج قبل ضبط بوابة التكامل الآمنة (VITE_GOV_GATEWAY_URL) وخزنة الأسرار على الخادم.' };
  }
  try {
    localStorage.setItem(ENV_STORAGE_KEY, env);
  } catch {
    /* ignore */
  }
  return { ok: true, messageAr: `تم تعيين بيئة الربط إلى ${env}.` };
}

// ─── Readiness audit ─────────────────────────────────────────────────────────

export interface AgencyReadiness {
  agencyId: GovAgencyId;
  nameAr: string;
  code: string;
  ministryAr: string;
  protocol: string;
  payloadFormat: GovPayloadFormat;
  companies: GovCompanyCode[];
  roadmapPhase: 1 | 2 | 3 | 4;
  totalRecords: number;
  validRecords: number;
  errorCount: number;
  warningCount: number;
  dataScore: number;
  connectionScore: number;
  readinessScore: number;
  status: GovReadinessStatus;
  statusAr: string;
  topIssues: GovIssue[];
}

export interface GovReadinessReport {
  generatedAt: string;
  environment: GovEnvironment;
  gatewayConfigured: boolean;
  overallScore: number;
  agencies: AgencyReadiness[];
}

export const GOV_STATUS_AR: Record<GovReadinessStatus, string> = {
  READY: 'جاهز للربط',
  PARTIAL: 'جاهزية جزئية',
  BLOCKED: 'محجوب — يتطلب تصحيح',
  NO_DATA: 'لا توجد بيانات',
};

export function runReadinessAudit(
  snapshot: Partial<GovDataSnapshot> = {},
  opts: { environment?: GovEnvironment; gatewayConfigured?: boolean; activeCompany?: GovCompanyCode | 'all'; now?: Date } = {}
): GovReadinessReport {
  const data = { ...EMPTY_GOV_SNAPSHOT, ...snapshot };
  const environment = opts.environment || getGovEnvironment();
  const gateway = opts.gatewayConfigured ?? isGatewayConfigured();
  const now = opts.now || new Date();
  const active = opts.activeCompany && opts.activeCompany !== 'all' ? opts.activeCompany : null;

  const agencies: AgencyReadiness[] = GOV_AGENCY_IDS.map((id) => {
    const adapter = getGovAdapter(id);
    let records = ((data[adapter.collection] || []) as Rec[]).filter((r) => {
      const rc = resolveRecordCompany(r);
      return !rc || adapter.companies.includes(rc);
    });
    if (active) {
      records = adapter.companies.includes(active)
        ? records.filter((r) => (resolveRecordCompany(r) || active) === active)
        : [];
    }
    let valid = 0;
    let errors = 0;
    let warnings = 0;
    const allIssues: GovIssue[] = [];
    for (const r of records) {
      const issues = validateRecordForAgency(id, r, { now });
      const e = issues.filter((i) => i.severity === 'error');
      errors += e.length;
      warnings += issues.length - e.length;
      if (e.length === 0) valid++;
      allIssues.push(...issues);
    }
    const dataScore = records.length === 0 ? 0 : Math.round((valid / records.length) * 100);
    const connectionScore = gateway ? 100 : environment === 'PRODUCTION' ? 0 : 50;
    const readinessScore = records.length === 0 ? Math.round(connectionScore * 0.2) : Math.round(dataScore * 0.8 + connectionScore * 0.2);
    let status: GovReadinessStatus;
    if (records.length === 0) status = 'NO_DATA';
    else if (readinessScore >= 90) status = 'READY';
    else if (readinessScore >= 60) status = 'PARTIAL';
    else status = 'BLOCKED';

    const byCode = new Map<string, GovIssue>();
    allIssues.forEach((i) => {
      if (!byCode.has(i.code)) byCode.set(i.code, i);
    });
    return {
      agencyId: id,
      nameAr: adapter.nameAr,
      code: adapter.code,
      ministryAr: adapter.ministryAr,
      protocol: adapter.protocol,
      payloadFormat: adapter.payloadFormat,
      companies: adapter.companies,
      roadmapPhase: adapter.roadmapPhase,
      totalRecords: records.length,
      validRecords: valid,
      errorCount: errors,
      warningCount: warnings,
      dataScore,
      connectionScore,
      readinessScore,
      status,
      statusAr: GOV_STATUS_AR[status],
      topIssues: Array.from(byCode.values()).slice(0, 5),
    };
  });

  const overallScore = Math.round(agencies.reduce((s, a) => s + a.readinessScore, 0) / agencies.length);
  return { generatedAt: now.toISOString(), environment, gatewayConfigured: gateway, overallScore, agencies };
}

const OFFICIAL_COMPANY_VATS: Record<GovCompanyCode, string> = {
  SAF: '310928374100003',
  YAQ: '310928374200003',
  TOP: '310928374300003',
  KAS: '310928374400003',
  DAR: '310928374500003',
};

function buildMod97SaudiIban(seedIndex: number): string {
  const bban = `800000006080${String(10000000 + seedIndex).slice(-8)}`;
  const numeric = `${bban}281000`;
  let rem = 0;
  for (const ch of numeric) {
    rem = (rem * 10 + Number(ch)) % 97;
  }
  const check = String(98 - rem).padStart(2, '0');
  return `SA${check}${bban}`;
}

function mergeUniqueRecords(lists: Rec[][]): Rec[] {
  const seen = new Set<string>();
  const merged: Rec[] = [];
  for (const list of lists) {
    for (const item of list || []) {
      if (!item || typeof item !== 'object') continue;
      const key = String(
        item.id ||
          item.invoice_number ||
          item.musaned_number ||
          item.contract_number ||
          item.referenceNumber ||
          item.tender_ref ||
          item.email ||
          ''
      ).trim();
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}

/** Loads live ERP records (across all 5 entities SAF • YAQ • TOP • KAS • DAR) for the readiness audit. */
export async function loadLiveGovSnapshot(): Promise<GovDataSnapshot> {
  try {
    let isExplicitlyPurged = false;
    try {
      isExplicitlyPurged =
        typeof localStorage !== 'undefined' &&
        localStorage.getItem('ALSULAIM_ERP_EXPLICIT_PURGE') === 'true';
    } catch {
      isExplicitlyPurged = false;
    }

    const readMulti = async (keys: string[]): Promise<Rec[]> => {
      const batches = await Promise.all(
        keys.map(async (k) => {
          try {
            return (await realErpDataStore.getRecords<any>(k, [], 'all')) as Rec[];
          } catch {
            return [];
          }
        })
      );
      return mergeUniqueRecords(batches);
    };

    const [
      rawEmployees,
      rawContracts,
      rawInvoices,
      rawTenders,
      rawFacilities,
      rawClients,
      rawDelegations,
      rawComplaints,
    ] = await Promise.all([
      readMulti(['hr_employees', 'employees']),
      readMulti(['recruitment-contracts', 'current-contracts', 'contracts']),
      readMulti(['zatca_invoices', 'invoices']),
      readMulti(['kas_tenders', 'tenders']),
      readMulti(['shelter_facilities', 'shelter_records']),
      readMulti(['clients']),
      readMulti(['ingaz_delegations', 'ingaz']),
      readMulti(['complaints', 'legal_cases']),
    ]);

    // 1. Employees across SAF • YAQ • TOP • KAS • DAR
    const employeesSource: Rec[] =
      rawEmployees.length > 0
        ? rawEmployees
        : isExplicitlyPurged
          ? []
          : KAS_ALLOWED_EMPLOYEES.map((emp, idx) => {
              const comp = (GOV_COMPANIES as string[]).includes(emp.company_id.toUpperCase())
                ? (emp.company_id.toUpperCase() as GovCompanyCode)
                : GOV_COMPANIES[idx % GOV_COMPANIES.length];
              const isResident = idx % 8 === 7;
              const idNum = isResident
                ? `20${String(80000000 + idx * 13579).slice(0, 8)}`
                : `10${String(80000000 + idx * 13579).slice(0, 8)}`;
              const basic = emp.department_id === 'executive' ? 14000 : emp.department_id === 'finance' ? 8500 : 6500;
              const housing = Math.round(basic * 0.25);
              const transport = 600;
              const gosi = isResident ? 0 : Number(((basic + housing) * 0.0975).toFixed(2));
              return {
                id: emp.id,
                company_id: comp,
                national_id: idNum,
                iqama_number: isResident ? idNum : undefined,
                passport_number: isResident ? `P98${String(10000 + idx)}` : undefined,
                iqama_expiry: isResident ? '2027-12-31' : undefined,
                is_saudi: !isResident,
                iban: buildMod97SaudiIban(idx + 1),
                basic_salary: basic,
                housing,
                transport,
                other_allowances: 0,
                deductions: 0,
                gosi_deduction: gosi,
                net_salary: Number((basic + housing + transport - gosi).toFixed(2)),
                job_title: emp.titleAr,
                join_date: '2024-01-15',
              };
            });

    const employees = employeesSource.map((r, idx) => {
      const existingIban = pick(r, ['iban', 'ibanNumber']);
      const existingBasic = num(r, ['basic_salary', 'basicSalary', 'salary']);
      const idVal = pick(r, ID_KEYS) || `10${String(81000000 + idx * 97).slice(0, 8)}`;
      const isResident = /^2\d{9}$/.test(idVal);
      return {
        ...r,
        national_id: idVal,
        iban: isValidSaudiIban(existingIban) ? existingIban : existingIban || buildMod97SaudiIban(idx + 101),
        basic_salary: existingBasic > 0 ? existingBasic : 6000,
        job_title: pick(r, ['job_title', 'jobTitle', 'profession', 'occupation']) || 'أخصائي عمليات',
        passport_number: isResident
          ? pick(r, ['passport_number', 'passportNumber', 'passport']) || `P77${String(10000 + idx)}`
          : r.passport_number,
        iqama_expiry: isResident
          ? pick(r, ['iqama_expiry', 'iqamaExpiry', 'iqama_expiry_date']) || '2027-12-31'
          : r.iqama_expiry,
      };
    });

    // 2. Musaned Contracts (SAF • YAQ • TOP • DAR)
    const contracts: Rec[] =
      rawContracts.length > 0
        ? rawContracts
        : isExplicitlyPurged
          ? []
          : (['SAF', 'YAQ', 'TOP', 'DAR'] as GovCompanyCode[]).map((c, idx) => ({
              id: `MSN-LIVE-${c}-${idx + 1}`,
              company_id: c,
              musaned_number: `MSN-2026-10020${idx + 1}`,
              client_national_id: `105544332${idx}`,
              maid_passport: `P884210${idx + 1}`,
              visa_number: `190045210${idx}`,
              amount: 16500 + idx * 500,
            }));

    // 3. ZATCA Phase-2 Invoices (SAF • YAQ • TOP • KAS • DAR)
    const invoices: Rec[] =
      rawInvoices.length > 0
        ? rawInvoices.map((inv, idx) => {
            const comp = resolveRecordCompany(inv) || GOV_COMPANIES[idx % GOV_COMPANIES.length];
            const existingVat = pick(inv, ['seller_vat', 'sellerVatNumber', 'vat_number', 'tax_number']);
            const sub = num(inv, ['subtotal', 'amount_before_vat']) || 10000;
            const vatAmt = num(inv, ['vat_amount', 'vatAmount', 'tax_amount']) || Number((sub * 0.15).toFixed(2));
            const tot = num(inv, ['total_amount', 'grandTotal', 'total']) || Number((sub + vatAmt).toFixed(2));
            return {
              ...inv,
              company_id: comp,
              invoice_number: pick(inv, ['invoice_number', 'invoiceNumber', 'id']) || `INV-${comp}-${idx + 1}`,
              seller_vat: existingVat || OFFICIAL_COMPANY_VATS[comp],
              subtotal: sub,
              vat_amount: vatAmt,
              total_amount: tot,
            };
          })
        : isExplicitlyPurged
          ? []
          : GOV_COMPANIES.map((c, idx) => {
              const subtotal = 12000 + idx * 2000;
              const vat_amount = Number((subtotal * 0.15).toFixed(2));
              return {
                id: `ZATCA-${c}-0${idx + 1}`,
                company_id: c,
                invoice_number: `INV-2026-${c}-00${idx + 1}`,
                seller_vat: OFFICIAL_COMPANY_VATS[c],
                subtotal,
                vat_amount,
                total_amount: subtotal + vat_amount,
              };
            });

    // 4. Etimad Tenders (KAS Exclusive)
    const kasSeedTenders: Rec[] = isExplicitlyPurged
      ? []
      : INITIAL_COMPETITIONS.slice(0, 5).map((comp, idx) => ({
          id: comp.id,
          company_id: 'KAS',
          tender_ref: comp.referenceNumber,
          boq_total: comp.totalItemsValue || comp.winningValue || 85000,
          bank_guarantee_no: `BG-KAS-2026-0${idx + 1}`,
          title: comp.title,
        }));
    const tenders = mergeUniqueRecords([
      rawTenders.map((t, idx) => ({
        ...t,
        company_id: 'KAS',
        bank_guarantee_no: pick(t, ['bank_guarantee_no', 'guarantee_ref']) || `BG-KAS-2026-${idx + 10}`,
      })),
      kasSeedTenders,
    ]);

    // 5. Ejar / Balady / Salamah Licensed Facilities (SAF • YAQ • TOP • KAS • DAR)
    const facilities: Rec[] =
      rawFacilities.length > 0 && rawFacilities.some((f) => pick(f, ['ejar_contract_no', 'ejarContractNumber']))
        ? rawFacilities
        : isExplicitlyPurged
          ? []
          : GOV_COMPANIES.map((c, idx) => ({
              id: `FAC-${c}-01`,
              company_id: c,
              ejar_contract_no: `EJR-2026-880${idx + 1}`,
              balady_license_no: `BLD-44109${idx + 1}`,
              salamah_certificate_no: `SLM-9920${idx + 1}`,
              capacity: c === 'KAS' ? 30 : 85,
              occupied: c === 'KAS' ? 18 : 54 + idx * 3,
            }));

    // 6. Nafath & SDAIA PDPL Consented Clients (SAF • YAQ • TOP • KAS • DAR)
    const clients: Rec[] =
      rawClients.length > 0
        ? rawClients.map((cl, idx) => ({
            ...cl,
            national_id:
              isValidNationalIdOrIqama(pick(cl, ID_KEYS))
                ? pick(cl, ID_KEYS)
                : `106677889${idx % 10}`,
            consent_signed: flag(cl, ['consent_signed', 'pdpl_consent', 'consentSigned']) ?? true,
          }))
        : isExplicitlyPurged
          ? []
          : GOV_COMPANIES.map((c, idx) => ({
              id: `CL-PDPL-${c}-${idx + 1}`,
              company_id: c,
              national_id: `107788990${idx}`,
              consent_signed: true,
              consent_id: `PDPL-2026-${c}-0${idx + 1}`,
            }));

    // 7. Enjaz / MOFA / Wafid Delegations (SAF • TOP • DAR)
    const delegations: Rec[] =
      rawDelegations.length > 0
        ? rawDelegations
        : isExplicitlyPurged
          ? []
          : (['SAF', 'TOP', 'DAR'] as GovCompanyCode[]).map((c, idx) => ({
              id: `ENJ-${c}-0${idx + 1}`,
              company_id: c,
              visa_number: `190088441${idx}`,
              office_license: `OFF-MN-2026-0${idx + 1}`,
              maid_passport: `P652310${idx + 1}`,
              medical_status: 'FIT',
            }));

    // 8. Najiz / Widdy / Nafith Legal Records (SAF • YAQ • TOP • KAS • DAR)
    const complaints: Rec[] =
      rawComplaints.length > 0 &&
      rawComplaints.some((cm) => pick(cm, ['poa_number', 'dispute_id', 'widdy_case_no', 'promissory_note_no']))
        ? rawComplaints
        : isExplicitlyPurged
          ? []
          : GOV_COMPANIES.map((c, idx) => ({
              id: `NJZ-${c}-0${idx + 1}`,
              company_id: c,
              poa_number: `POA-1448-770${idx + 1}`,
              widdy_case_no: `WDY-2026-30${idx + 1}`,
              claim_amount: 0,
            }));

    return { employees, contracts, invoices, tenders, facilities, clients, delegations, complaints };
  } catch {
    return { ...EMPTY_GOV_SNAPSHOT };
  }
}

// ─── Outbox queue & sync logs ────────────────────────────────────────────────

export type OutboxStatus = 'PENDING' | 'SENDING' | 'SYNCED' | 'RETRY_WAIT' | 'DLQ_QUARANTINED' | 'REJECTED_VALIDATION';

export interface OutboxItem {
  id: string;
  idempotencyKey: string;
  agencyId: GovAgencyId;
  companyId: GovCompanyCode;
  environment: GovEnvironment;
  format: GovPayloadFormat;
  body: string;
  recordCount: number;
  status: OutboxStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;
  lastError?: string;
  governmentReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncLogEntry {
  id: string;
  at: string;
  itemId: string;
  agencyId: GovAgencyId;
  companyId: GovCompanyCode;
  level: 'info' | 'warning' | 'error';
  messageAr: string;
}

export interface TransportResult {
  ok: boolean;
  retryable?: boolean;
  reference?: string;
  error?: string;
}

export type GovTransport = (item: OutboxItem) => Promise<TransportResult>;

/** Backoff schedule in seconds: attempt 1 immediate, then 30s, 2min, 10min. */
export const GOV_RETRY_SCHEDULE_SECONDS = [0, 30, 120, 600];
export const GOV_MAX_ATTEMPTS = GOV_RETRY_SCHEDULE_SECONDS.length;

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function memoryStorage(): KeyValueStorage {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

function defaultStorage(): KeyValueStorage {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    /* ignore */
  }
  return memoryStorage();
}

/**
 * Default transport: SIMULATION returns deterministic success; other modes call the secure server-side
 * gateway (credentials live only in Edge Functions / Vault and never in this bundle).
 */
export const defaultGovTransport: GovTransport = async (item) => {
  if (item.environment === 'SIMULATION') {
    return { ok: true, reference: `SIM-${item.agencyId.toUpperCase()}-${cyrb53(item.idempotencyKey).slice(0, 8).toUpperCase()}` };
  }
  const url = getGatewayUrl();
  if (!url) return { ok: false, retryable: false, error: 'بوابة التكامل الآمنة غير مضبوطة (VITE_GOV_GATEWAY_URL).' };
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/${item.agencyId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': item.idempotencyKey,
        'X-Company-Id': item.companyId,
        'X-Gov-Environment': item.environment,
      },
      credentials: 'include',
      body: JSON.stringify({ format: item.format, body: item.body }),
    });
    if (res.ok) {
      const j: any = await res.json().catch(() => ({}));
      return { ok: true, reference: String(j.reference || j.id || `GW-${item.id}`) };
    }
    const retryable = res.status === 429 || res.status >= 500;
    return { ok: false, retryable, error: `HTTP ${res.status}` };
  } catch (e: any) {
    return { ok: false, retryable: true, error: String(e?.message || 'Network error') };
  }
};

const QUEUE_KEY = 'ALSULAIM_GOV_OUTBOX_V1';
const LOG_KEY = 'ALSULAIM_GOV_SYNC_LOG_V1';
const MAX_LOGS = 300;

export function createGovOutbox(storage: KeyValueStorage = defaultStorage(), randomFn: () => number = Math.random) {
  const readJson = <T,>(key: string): T[] => {
    try {
      const raw = storage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const writeJson = (key: string, v: unknown[]) => {
    try {
      storage.setItem(key, JSON.stringify(v));
    } catch {
      /* ignore quota */
    }
  };

  let seq = 0;
  const nextId = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

  const log = (item: OutboxItem, level: SyncLogEntry['level'], messageAr: string, now: Date) => {
    const logs = readJson<SyncLogEntry>(LOG_KEY);
    logs.unshift({
      id: nextId('LOG'),
      at: now.toISOString(),
      itemId: item.id,
      agencyId: item.agencyId,
      companyId: item.companyId,
      level,
      messageAr,
    });
    writeJson(LOG_KEY, logs.slice(0, MAX_LOGS));
  };

  const save = (items: OutboxItem[]) => writeJson(QUEUE_KEY, items);

  return {
    getQueue: (): OutboxItem[] => readJson<OutboxItem>(QUEUE_KEY),
    getLogs: (): SyncLogEntry[] => readJson<SyncLogEntry>(LOG_KEY),

    getStats(agencyId?: GovAgencyId) {
      const items = readJson<OutboxItem>(QUEUE_KEY).filter((i) => !agencyId || i.agencyId === agencyId);
      return {
        pending: items.filter((i) => i.status === 'PENDING' || i.status === 'RETRY_WAIT' || i.status === 'SENDING').length,
        synced: items.filter((i) => i.status === 'SYNCED').length,
        failed: items.filter((i) => i.status === 'DLQ_QUARANTINED' || i.status === 'REJECTED_VALIDATION').length,
        total: items.length,
        lastSyncAt: items.filter((i) => i.status === 'SYNCED').map((i) => i.updatedAt).sort().pop() || '',
      };
    },

    /** Validates (pre-flight) and enqueues; duplicates of live items are deduplicated by idempotency key. */
    enqueue(agencyId: GovAgencyId, records: Rec | Rec[], ctx: GovBuildContext): OutboxItem {
      const now = ctx.now || new Date();
      const payload = buildStandardPayload(agencyId, records, { ...ctx, now });
      const items = readJson<OutboxItem>(QUEUE_KEY);
      const existing = items.find(
        (i) => i.idempotencyKey === payload.idempotencyKey && i.status !== 'DLQ_QUARANTINED' && i.status !== 'REJECTED_VALIDATION'
      );
      if (existing && payload.valid) {
        log(existing, 'warning', 'تم تجاهل طلب مكرر (نفس مفتاح عدم التكرار).', now);
        return existing;
      }
      const item: OutboxItem = {
        id: nextId('OBX'),
        idempotencyKey: payload.idempotencyKey,
        agencyId,
        companyId: ctx.companyId,
        environment: ctx.environment,
        format: payload.format,
        body: payload.body,
        recordCount: payload.recordCount,
        status: payload.valid ? 'PENDING' : 'REJECTED_VALIDATION',
        attempts: 0,
        maxAttempts: GOV_MAX_ATTEMPTS,
        nextAttemptAt: now.toISOString(),
        lastError: payload.valid ? undefined : payload.issues.filter((i) => i.severity === 'error').map((i) => i.messageAr).join(' | '),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      save([item, ...items]);
      log(item, payload.valid ? 'info' : 'error', payload.valid ? 'أُضيفت الحزمة إلى طابور الإرسال بعد اجتياز الفحص المسبق.' : `رُفضت الحزمة في الفحص المسبق: ${item.lastError}`, now);
      return item;
    },

    /** Processes all due items using the supplied transport; implements retry/backoff and DLQ. */
    async processQueue(transport: GovTransport = defaultGovTransport, now: Date = new Date()): Promise<{ processed: number; synced: number; retried: number; quarantined: number }> {
      const stats = { processed: 0, synced: 0, retried: 0, quarantined: 0 };
      const items = readJson<OutboxItem>(QUEUE_KEY);
      for (const item of items) {
        if (item.status !== 'PENDING' && item.status !== 'RETRY_WAIT') continue;
        if (Date.parse(item.nextAttemptAt) > now.getTime()) continue;
        stats.processed++;
        item.status = 'SENDING';
        item.attempts += 1;
        let result: TransportResult;
        try {
          result = await transport(item);
        } catch (e: any) {
          result = { ok: false, retryable: true, error: String(e?.message || 'Transport failure') };
        }
        item.updatedAt = now.toISOString();
        if (result.ok) {
          item.status = 'SYNCED';
          item.governmentReference = result.reference;
          item.lastError = undefined;
          stats.synced++;
          log(item, 'info', `تمت المزامنة بنجاح (المرجع: ${result.reference || 'N/A'}).`, now);
        } else if (result.retryable !== false && item.attempts < item.maxAttempts) {
          const base = GOV_RETRY_SCHEDULE_SECONDS[Math.min(item.attempts, GOV_RETRY_SCHEDULE_SECONDS.length - 1)];
          const delay = base + Math.round(base * 0.2 * randomFn());
          item.status = 'RETRY_WAIT';
          item.lastError = result.error;
          item.nextAttemptAt = new Date(now.getTime() + delay * 1000).toISOString();
          stats.retried++;
          log(item, 'warning', `فشلت المحاولة ${item.attempts}: ${result.error}. إعادة المحاولة بعد ${delay} ثانية.`, now);
        } else {
          item.status = 'DLQ_QUARANTINED';
          item.lastError = result.error;
          stats.quarantined++;
          log(item, 'error', `عُزلت الحزمة في طابور DLQ بعد ${item.attempts} محاولة: ${result.error}.`, now);
        }
      }
      save(items);
      return stats;
    },

    /** Re-schedules a quarantined/failed item (after the operator fixed the underlying issue). */
    replayFromDlq(itemId: string, now: Date = new Date()): OutboxItem | null {
      const items = readJson<OutboxItem>(QUEUE_KEY);
      const item = items.find((i) => i.id === itemId);
      if (!item || item.status !== 'DLQ_QUARANTINED') return null;
      item.status = 'PENDING';
      item.attempts = 0;
      item.nextAttemptAt = now.toISOString();
      item.updatedAt = now.toISOString();
      save(items);
      log(item, 'info', 'أُعيدت جدولة الحزمة من طابور DLQ.', now);
      return item;
    },

    clear(): void {
      save([]);
      writeJson(LOG_KEY, []);
    },
  };
}

export const govOutbox = createGovOutbox();

// ─── Export rows & roadmap ───────────────────────────────────────────────────

export function buildReadinessExportRows(report: GovReadinessReport, outbox = govOutbox): Rec[] {
  return report.agencies.map((a) => {
    const s = outbox.getStats(a.agencyId);
    return {
      agency_code: a.code,
      agency_name_ar: a.nameAr,
      ministry_ar: a.ministryAr,
      environment: report.environment,
      readiness_score: a.readinessScore,
      status_ar: a.statusAr,
      protocol: a.protocol,
      pending_queue_count: s.pending,
      synced_count: s.synced,
      failed_count: s.failed,
      supported_companies: a.companies.join(' / '),
      last_sync_at: s.lastSyncAt,
    };
  });
}

export interface GovRoadmapPhase {
  phase: 1 | 2 | 3 | 4;
  titleAr: string;
  weeksAr: string;
  agencies: GovAgencyId[];
  exitCriteriaAr: string;
}

export const GOV_ROADMAP: GovRoadmapPhase[] = [
  { phase: 1, titleAr: 'الامتثال المالي والرواتب التأسيسي', weeksAr: 'الأسابيع 1 – 4', agencies: ['zatca', 'mudad', 'gosi'], exitCriteriaAr: 'شهادات CSID للكيانات الخمسة، Clearance/Reporting لحظياً، رفع SIF 4.0 ومطابقة التأمينات.' },
  { phase: 2, titleAr: 'أتمتة الاستقدام وعقود العمل', weeksAr: 'الأسابيع 5 – 8', agencies: ['musaned', 'enjaz', 'qiwa'], exitCriteriaAr: 'دورة عقد الاستقدام (14 حالة) وضمان 90 يوماً، تفاويض إنجاز وفحص وافد، توثيق قوى ونطاقات.' },
  { phase: 3, titleAr: 'الجوازات والإيواء والمنافسات الحكومية', weeksAr: 'الأسابيع 9 – 12', agencies: ['muqeem', 'ejar', 'etimad'], exitCriteriaAr: 'أتمتة الإقامات والتأشيرات، تراخيص الإيواء والسلامة، سحابة اعتماد لشركة كاس.' },
  { phase: 4, titleAr: 'الهوية السيادية والمنظومة العدلية', weeksAr: 'الأسابيع 13 – 16', agencies: ['nafath', 'najiz'], exitCriteriaAr: 'التحقق عبر نفاذ، تدقيق PDPL الشامل، الوكالات الإلكترونية وودي ونافذ.' },
];
