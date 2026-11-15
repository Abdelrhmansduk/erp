import { describe, it, expect, vi, afterEach } from 'vitest';
import * as XLSX from 'xlsx';
import {
  SECTION_CONFIGS,
  resolveConfig,
  exportData,
  exportToPrint,
  printOfficialReport,
  buildCsvContent,
  buildWpsSifContent,
  buildStyledExcelBuffer,
  generateExecutiveReportHtml,
  normalizeSaudiIban,
  normalizeSaudiNationalId,
  sanitizeExportCellValue,
} from '../services/exportService';
import { useAppStore } from '../stores/appStore';
import {
  encodeZatcaTlvBase64,
  decodeZatcaTlvBase64,
  validateZatcaTlvBase64,
} from '../utils/realBarcodeGenerator';
import {
  ensureSaudiRiyalSymbol,
  formatSaudiRiyal,
  validateSamaRiyalCompliance,
  SAUDI_RIYAL_SYMBOL,
} from '../utils/saudiRiyal';

const LEGACY_RIYAL = '\u0631.\u0633';

const REQUIRED_SECTION_KEYS = [
  // contracts, rent, CVs, orders
  'recruitment-contracts', 'recruitment_contracts', 'rent-contracts', 'rent_contracts', 'cvs', 'cvs-bank', 'cvs_rental',
  'cvs-recruitment', 'orders', 'rent-packages', 'rent_packages', 'agent-imports', 'agent_imports',
  // shelter, sponsorship, travel, complaints, offices
  'shelter', 'shelter_workers', 'sponsorship-transfer', 'sponsorship_transfer', 'travel', 'complaints',
  'external-offices', 'external_offices',
  // finance
  'vouchers', 'journals', 'journal_entries', 'cost_centers', 'cost-centers', 'custodies', 'zatca', 'trial_balance',
  'income_statement', 'balance_sheet', 'invoices', 'vat-declaration', 'vat_declaration', 'inventory',
  // HR / WPS / attendance
  'employees', 'payroll', 'wps', 'attendances', 'hr_gosi',
  // KAS / tenders / legal / admin / gov
  'tenders-boq', 'tenders_boq', 'kas-etmad', 'kas_etmad', 'kas_competitions', 'kas-commercial', 'kas_commercial',
  'ingaz', 'legal-compliance', 'legal_compliance', 'legal_undertakings', 'users', 'iam', 'activity-logs',
  'activity_logs', 'activity_log', 'gov-integrations', 'gov_integrations', 'government-hub', 'musaned-plan',
  'musaned_master_plan', 'sent-messages', 'sent_messages', 'unified-correspondence', 'unified_correspondence',
  'branch-communication', 'branch_communication', 'group-dispatch', 'group_dispatch', 'master_constants',
  'master_constants_banks', 'employee_self_service', 'admin_dashboard', 'microsoft_integrations', 'settings_rbac',
  'estimates', 'credit_notes', 'categories', 'staff',
];

describe('exportService — section registry coverage', () => {
  it.each(REQUIRED_SECTION_KEYS)('resolves a dedicated Arabic config for "%s"', key => {
    const hasDirect = Boolean(SECTION_CONFIGS[key]);
    const normalizedHit =
      SECTION_CONFIGS[key.replace(/-/g, '_')] || SECTION_CONFIGS[key.replace(/_/g, '-')];
    expect(hasDirect || Boolean(normalizedHit)).toBe(true);
    const cfg = resolveConfig(key, [], undefined);
    expect(cfg.headers.length).toBeGreaterThan(1);
    expect(cfg.headers.some(h => /[\u0600-\u06FF]/.test(h))).toBe(true);
    expect(cfg.dataMapper({}).length).toBe(cfg.headers.length);
  });

  it('registers both kebab-case and snake_case variants for new sections', () => {
    ['gov-integrations', 'gov_integrations', 'activity-logs', 'activity_logs', 'kas-etmad', 'kas_etmad'].forEach(k => {
      expect(SECTION_CONFIGS[k]).toBeDefined();
    });
  });

  it('maps gov-integrations fields reported by the gov hub', () => {
    const cfg = resolveConfig('gov-integrations', []);
    const row = cfg.dataMapper({
      agency_code: 'MUSANED', agency_name_ar: 'مساند', ministry_ar: 'وزارة الموارد البشرية', environment: 'Production',
      readiness_score: 92, status_ar: 'متصل', protocol: 'REST/OAuth2', pending_queue_count: 3, synced_count: 120,
      failed_count: 1, supported_companies: 'الكل', last_sync_at: '2026-01-01',
    });
    expect(row[0]).toBe('MUSANED');
    expect(row[4]).toBe(92);
    expect(row).not.toContain('undefined');
  });

  it('contains no literal legacy riyal abbreviation inside any header or title', () => {
    Object.values(SECTION_CONFIGS).forEach(cfg => {
      expect(cfg.sectionTitle.includes(LEGACY_RIYAL)).toBe(false);
      cfg.headers.forEach(h => expect(h.includes(LEGACY_RIYAL)).toBe(false));
    });
  });
});

describe('exportService — safe cell sanitization', () => {
  it('never emits undefined / NaN / Invalid Date / [object Object]', () => {
    expect(sanitizeExportCellValue(undefined)).toBe('');
    expect(sanitizeExportCellValue(null)).toBe('');
    expect(sanitizeExportCellValue(NaN)).toBe(0);
    expect(sanitizeExportCellValue(new Date('nope'))).toBe('');
    expect(sanitizeExportCellValue('Invalid Date')).toBe('');
    expect(sanitizeExportCellValue('[object Object]')).toBe('');
    expect(sanitizeExportCellValue(['أ', 'ب'])).toBe('أ، ب');
    expect(String(sanitizeExportCellValue({ a: 1 }))).toBe('{"a":1}');
  });

  it('sanitizes mapper output coming from invalid records in every format', () => {
    const bad = [{ created_at: 'garbage', name: undefined, phone: { x: 1 }, client_no: NaN }];
    const csv = buildCsvContent('clients', bad);
    expect(csv).not.toMatch(/undefined|NaN|Invalid Date|\[object Object\]/);
    const html = generateExecutiveReportHtml('clients', bad, undefined, false);
    expect(html).not.toMatch(/Invalid Date|\[object Object\]/);
  });

  it('tolerates null / non-array data without throwing', () => {
    expect(() => exportData('clients', null as any, 'csv')).not.toThrow();
    expect(() => buildCsvContent('clients', undefined as any)).not.toThrow();
    expect(() => buildStyledExcelBuffer('clients', null as any)).not.toThrow();
    expect(() => generateExecutiveReportHtml('clients', null as any)).not.toThrow();
  });
});

describe('exportService — CSV (UTF-8 BOM, Arabic, injection safety)', () => {
  it('starts with BOM, uses CRLF, quotes Arabic headers and keeps negative numbers numeric', () => {
    const csv = buildCsvContent('vouchers', [{ voucher_number: 'RV-1', amount: -150.5, description: '=cmd()' }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('\r\n');
    expect(csv).toContain('"-150.5"');
    expect(csv).toContain("\"'=cmd()\"");
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0].startsWith('"')).toBe(true);
    expect(/[\u0600-\u06FF]/.test(lines[0])).toBe(true);
  });

  it('escapes embedded double quotes (RFC 4180)', () => {
    const csv = buildCsvContent('clients', [{ name: 'شركة "الأفق"' }]);
    expect(csv).toContain('"شركة ""الأفق"""');
  });

  it('returns a header-only BOM CSV for empty data', () => {
    const csv = buildCsvContent('clients', []);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1).split('\r\n').length).toBe(1);
  });
});

describe('exportService — Excel & HTML reports', () => {
  it('produces a valid xlsx buffer with RTL view and rows for new sections', () => {
    const { buffer, fileName } = buildStyledExcelBuffer('kas-commercial', [
      { reference_no: 'D-1', division: 'الأميال', client_name: 'عميل', total_with_vat: 1150, vat_amount: 150 },
    ]);
    expect(buffer.length).toBeGreaterThan(500);
    expect(fileName.endsWith('.xlsx')).toBe(true);
    const wb = XLSX.read(buffer, { type: 'array' });
    expect(wb.SheetNames.length).toBeGreaterThan(0);
  });

  it('official HTML report is RTL and carries the SAMA riyal symbol', () => {
    const html = generateExecutiveReportHtml('vouchers', [{ voucher_number: 'RV-1', amount: 1000 }], undefined, true);
    expect(html).toContain('dir="rtl"');
    expect(html).toContain(SAUDI_RIYAL_SYMBOL);
    expect(html.includes(LEGACY_RIYAL)).toBe(false);
  });
});

describe('exportService — print popup blocker handling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('warns the user (no silent failure) and falls back when window.open is blocked', () => {
    const openMock = vi.fn(() => null);
    vi.stubGlobal('open', openMock);
    (window as any).open = openMock;
    const addNotification = vi.fn();
    vi.spyOn(useAppStore, 'getState').mockReturnValue({ ...useAppStore.getState(), addNotification } as any);

    expect(() => exportToPrint('clients', [{ name: 'أ' }])).not.toThrow();
    expect(openMock).toHaveBeenCalled();
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning' }));
    vi.unstubAllGlobals();
  });

  it('printOfficialReport writes the RTL report into the opened window', () => {
    const write = vi.fn();
    const close = vi.fn();
    const openMock = vi.fn(() => ({ document: { write, close } }));
    (window as any).open = openMock;
    expect(printOfficialReport('clients', [{ name: 'أ' }])).toBe(true);
    expect(write).toHaveBeenCalledWith(expect.stringContaining('dir="rtl"'));
    expect(close).toHaveBeenCalled();
  });
});

describe('exportService — WPS SIF compliance', () => {
  const employee = {
    nationalId: '1092837410',
    name: 'أحمد علي',
    iban: 'SA03 8000 0000 6080 1016 7519',
    basicSalary: 5000,
    housingAllowance: 1250,
    transportAllowance: 500,
    otherAllowances: 250,
    deductions: 100,
  };

  it('normalizes IBAN to 24 chars and ID to 10 digits', () => {
    expect(normalizeSaudiIban('sa03 8000 0000 6080 1016 7519')).toBe('SA0380000000608010167519');
    expect(/^SA\d{22}$/.test(normalizeSaudiIban('bad'))).toBe(true);
    expect(/^SA\d{22}$/.test(normalizeSaudiIban(undefined, '1092837410'))).toBe(true);
    expect(normalizeSaudiNationalId('2123456789')).toBe('2123456789');
    expect(/^[12]\d{9}$/.test(normalizeSaudiNationalId('123'))).toBe(true);
    expect(/^[12]\d{9}$/.test(normalizeSaudiNationalId(undefined, 3))).toBe(true);
  });

  it('builds BOM + SCR + EDR records with exact net salary formula', () => {
    const sif = buildWpsSifContent('payroll', [employee], undefined, undefined, new Date('2026-03-15T09:30:00Z'));
    expect(sif.charCodeAt(0)).toBe(0xfeff);
    const lines = sif.slice(1).split('\r\n');
    const scr = lines.find(l => l.startsWith('SCR,'))!;
    const edr = lines.filter(l => l.startsWith('EDR,'));
    expect(edr).toHaveLength(1);
    const f = edr[0].split(',');
    expect(f[1]).toMatch(/^[12]\d{9}$/);
    expect(f[3]).toMatch(/^SA\d{22}$/);
    // gosi = (5000 + 1250) * 0.0975 = 609.375 → net = 5000 + 1250 + 750 - (100 + 609.375)
    const expectedNet = (5000 + 1250 + 500 + 250 - 100 - 609.375).toFixed(2);
    expect(f[5]).toBe(expectedNet);
    expect(scr.split(',')[8]).toBe(parseFloat(expectedNet).toFixed(2));
    expect(scr.split(',')[9]).toBe('1');
    expect(scr).toMatch(/SA\d{22}/);
  });

  it('caps GOSI wage base at 45,000 and honours an explicit netSalary', () => {
    const rich = { nationalId: '1000000001', name: 'مدير', basicSalary: 40000, housingAllowance: 10000 };
    const f = buildWpsSifContent('payroll', [rich]).slice(1).split('\r\n').find(l => l.startsWith('EDR,'))!.split(',');
    expect(f[9]).toBe((45000 * 0.0975).toFixed(2));
    const explicit = buildWpsSifContent('payroll', [{ ...rich, netSalary: 1234.5 }]).split('\r\n').find(l => l.startsWith('EDR,'))!.split(',');
    expect(explicit[5]).toBe('1234.50');
  });

  it('never produces NaN or commas inside names and handles empty payroll', () => {
    const sif = buildWpsSifContent('payroll', [{ name: 'علي, محمد', basicSalary: 'abc' }]);
    expect(sif).not.toMatch(/NaN|undefined/);
    expect(buildWpsSifContent('payroll', []).split('\r\n').filter(l => l.startsWith('EDR,'))).toHaveLength(0);
  });

  it('payroll config fallback IBAN is exactly 24 chars', () => {
    const row = SECTION_CONFIGS.payroll.dataMapper({ national_id: '1092837410', name: 'x', salary: 8000 });
    expect(String(row[3])).toMatch(/^SA\d{22}$/);
  });
});

describe('ZATCA TLV Base64 QR', () => {
  it('round-trips the 5 mandatory tags and validates', () => {
    const b64 = encodeZatcaTlvBase64({
      sellerName: 'مجموعة خالد السليم التجارية',
      vatNumber: '310928374100003',
      timestampIso: '2026-03-15T09:30:00Z',
      totalWithVat: '1,150.00',
      vatAmount: 150,
    });
    const d = decodeZatcaTlvBase64(b64);
    expect(d.sellerName).toBe('مجموعة خالد السليم التجارية');
    expect(d.vatNumber).toBe('310928374100003');
    expect(d.totalWithVat).toBe('1150.00');
    expect(d.vatAmount).toBe('150.00');
    expect(validateZatcaTlvBase64(b64).valid).toBe(true);
  });

  it('falls back to safe defaults for invalid VAT / timestamp / amounts', () => {
    const b64 = encodeZatcaTlvBase64({
      sellerName: '',
      vatNumber: '123',
      timestampIso: 'not-a-date',
      totalWithVat: NaN as any,
      vatAmount: undefined as any,
    });
    const v = validateZatcaTlvBase64(b64);
    expect(v.valid).toBe(true);
    expect(v.fields.totalWithVat).toBe('0.00');
  });

  it('flags a malformed payload', () => {
    expect(validateZatcaTlvBase64('').valid).toBe(false);
  });
});

describe('saudiRiyal — ensureSaudiRiyalSymbol', () => {
  it('formats numbers and numeric strings with the SAMA symbol', () => {
    expect(ensureSaudiRiyalSymbol(1250)).toBe(formatSaudiRiyal(1250));
    expect(ensureSaudiRiyalSymbol('1,250.50')).toContain(SAUDI_RIYAL_SYMBOL);
    expect(ensureSaudiRiyalSymbol(null)).toContain(SAUDI_RIYAL_SYMBOL);
  });

  it('converts legacy abbreviations and keeps compliant strings', () => {
    const legacy = ensureSaudiRiyalSymbol(`1,000 ${LEGACY_RIYAL}`);
    expect(legacy.includes(LEGACY_RIYAL)).toBe(false);
    expect(validateSamaRiyalCompliance(legacy).isCompliant).toBe(true);
    expect(ensureSaudiRiyalSymbol('500 SAR')).toContain(SAUDI_RIYAL_SYMBOL);
    const ok = formatSaudiRiyal(10);
    expect(ensureSaudiRiyalSymbol(ok)).toBe(ok);
    expect(ensureSaudiRiyalSymbol('غير محدد')).toBe('غير محدد');
  });
});
