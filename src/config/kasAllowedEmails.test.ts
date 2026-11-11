import { describe, it, expect } from 'vitest';
import {
  KAS_ALLOWED_EMPLOYEES,
  EXCLUDED_KAS_EMAILS,
  findAllowedKasEmployee,
} from './kasAllowedEmails';
import { KAS_EMPLOYEE_PASSWORD_HASHES } from './kasEmployeePasswordHashes';
import {
  authService,
  validateAllowedCorporateEmail,
  getFullStaffDirectory,
  UserProfile,
} from '../services/authService';
import { chartOfAccountsService } from '../services/accounting/chartOfAccountsService';

function buildProfileForKasEmail(email: string): UserProfile {
  const emp = findAllowedKasEmployee(email);
  if (!emp) {
    throw new Error(`Missing employee in KAS_ALLOWED_EMPLOYEES: ${email}`);
  }
  const dirEntry = getFullStaffDirectory().find(
    (d) => d.email.toLowerCase() === email.toLowerCase()
  );
  return {
    id: emp.id,
    username: emp.username,
    full_name: emp.nameAr,
    email: emp.email,
    role: emp.titleAr,
    branch: emp.branch,
    company_id: emp.company_id,
    department_id: emp.department_id,
    department_name_ar: dirEntry?.department_id || emp.department_id,
    default_tab: emp.defaultTab,
    default_tab_title: emp.defaultTabTitle,
    allowed_tabs_override: emp.allowedTabsOverride,
    extra_allowed_departments: emp.extraAllowedDepartments,
    status: 'نشط',
    created_at: '2026-01-01T00:00:00Z',
  };
}

describe('KAS Official Email Whitelist & 9-Department / Standalone KAS Trade RBAC', () => {
  it('contains exactly 69 authorized @kas.sa staff accounts and permanently blocks Osama Saeed (Buffet Kitchen)', () => {
    expect(KAS_ALLOWED_EMPLOYEES).toHaveLength(69);
    expect(EXCLUDED_KAS_EMAILS['o.saeed.hospitality@kas.sa']).toBeDefined();

    const blockedCheck = validateAllowedCorporateEmail('o.saeed.hospitality@kas.sa');
    expect(blockedCheck.allowed).toBe(false);
    expect(blockedCheck.reason).toContain('مطبخ البوفيه');

    const unlistedKasCheck = validateAllowedCorporateEmail('intruder.unknown@kas.sa');
    expect(unlistedKasCheck.allowed).toBe(false);

    // Every single approved @kas.sa employee has a salted SHA-256 strong password digest; excluded account has none
    expect(Object.keys(KAS_EMPLOYEE_PASSWORD_HASHES)).toHaveLength(69);
    for (const emp of KAS_ALLOWED_EMPLOYEES) {
      expect(KAS_EMPLOYEE_PASSWORD_HASHES[emp.email.toLowerCase()]).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(KAS_EMPLOYEE_PASSWORD_HASHES['o.saeed.hospitality@kas.sa']).toBeUndefined();
  });

  it('enforces complete two-way separation between Standalone KAS Trade Company (KAS) and Recruitment/Shelter', () => {
    const kasTradeDirector = buildProfileForKasEmail('f.alhassan.trade@kas.sa');
    const kasProcurement = buildProfileForKasEmail('g.ahmed.trade@kas.sa');
    const kasShowroom = buildProfileForKasEmail('b.allaboudi.showroom@kas.sa');
    const kasImal = buildProfileForKasEmail('m.alsaleh.imal@kas.sa');
    const kasAccountant = buildProfileForKasEmail('m.alata.trade@kas.sa');

    // 1. All KAS Trade / Commercial / Finance staff must be 100% blocked from Recruitment, Musaned, Ingaz, CVs, Rental & Shelter
    for (const kasUser of [kasTradeDirector, kasProcurement, kasShowroom, kasImal, kasAccountant]) {
      expect(authService.isTabAuthorizedForUser(kasUser, 'recruitment-contracts')).toBe(false);
      expect(authService.isTabAuthorizedForUser(kasUser, 'orders')).toBe(false);
      expect(authService.isTabAuthorizedForUser(kasUser, 'clients')).toBe(false);
      expect(authService.isTabAuthorizedForUser(kasUser, 'cvs-recruitment')).toBe(false);
      expect(authService.isTabAuthorizedForUser(kasUser, 'ingaz')).toBe(false);
      expect(authService.isTabAuthorizedForUser(kasUser, 'rent-contracts')).toBe(false);
      expect(authService.isTabAuthorizedForUser(kasUser, 'shelter-suite')).toBe(false);
      expect(authService.isTabAuthorizedForUser(kasUser, 'musaned-escrow')).toBe(false);
      expect(authService.isTabAuthorizedForUser(kasUser, 'suppliers-agents')).toBe(false);
      expect(authService.validateCompanyAccess(kasUser, 'SAF').allowed).toBe(false);
      expect(authService.validateCompanyAccess(kasUser, 'TOP').allowed).toBe(false);
      expect(authService.validateCompanyAccess(kasUser, 'YAQ').allowed).toBe(false);
      expect(authService.validateCompanyAccess(kasUser, 'DAR').allowed).toBe(false);
      expect(authService.validateCompanyAccess(kasUser, 'KAS').allowed).toBe(true);
    }

    // 2. Non-KAS employees (Recruitment, Rental, Shelter, Followup, Marketing) must be 100% blocked from KAS Trade
    const safirStaff = buildProfileForKasEmail('h.hassan.safir@kas.sa');
    const followupStaff = buildProfileForKasEmail('m.fouda.followup@kas.sa');
    const marketingStaff = buildProfileForKasEmail('mustafa.marketing@kas.sa');
    const shelterStaff = buildProfileForKasEmail('r.aljbr.housing@kas.sa');

    for (const recUser of [safirStaff, followupStaff, marketingStaff, shelterStaff]) {
      expect(authService.isTabAuthorizedForUser(recUser, 'kas-suite')).toBe(false);
      expect(authService.isTabAuthorizedForUser(recUser, 'kas-commercial')).toBe(false);
      expect(authService.isTabAuthorizedForUser(recUser, 'tenders-boq')).toBe(false);
      expect(authService.isTabAuthorizedForUser(recUser, 'kas-etmad')).toBe(false);
      expect(authService.validateCompanyAccess(recUser, 'KAS').allowed).toBe(false);
    }
  });

  it('enforces internal role boundaries inside KAS Trade (.trade competitions vs .showroom/.imal commercial vs office helpers)', () => {
    const kasTradeDirector = buildProfileForKasEmail('f.alhassan.trade@kas.sa');
    const kasProcurement = buildProfileForKasEmail('g.ahmed.trade@kas.sa');
    const kasShowroom = buildProfileForKasEmail('b.allaboudi.showroom@kas.sa');
    const kasImal = buildProfileForKasEmail('m.alsaleh.imal@kas.sa');
    const kasAccountant = buildProfileForKasEmail('m.alata.trade@kas.sa');
    const kasOfficeHelper = buildProfileForKasEmail('m.robel.trade@kas.sa');

    // Trade Director sees both competitions & commercial divisions
    expect(authService.isTabAuthorizedForUser(kasTradeDirector, 'kas-suite')).toBe(true);
    expect(authService.isTabAuthorizedForUser(kasTradeDirector, 'kas-commercial')).toBe(true);

    // Procurement (.trade) sees KAS Competitions (`kas-suite`, `tenders-boq`, `kas-etmad`), NOT `.showroom`/`.imal` sales
    expect(authService.isTabAuthorizedForUser(kasProcurement, 'kas-suite')).toBe(true);
    expect(authService.isTabAuthorizedForUser(kasProcurement, 'tenders-boq')).toBe(true);
    expect(authService.isTabAuthorizedForUser(kasProcurement, 'kas-commercial')).toBe(false);

    // Showroom & Imal see `kas-commercial`, inventory & ZATCA invoices, NOT `kas-suite` tenders
    expect(authService.isTabAuthorizedForUser(kasShowroom, 'kas-commercial')).toBe(true);
    expect(authService.isTabAuthorizedForUser(kasShowroom, 'kas-suite')).toBe(false);
    expect(authService.isTabAuthorizedForUser(kasImal, 'kas-commercial')).toBe(true);
    expect(authService.isTabAuthorizedForUser(kasImal, 'tenders-boq')).toBe(false);

    // KAS Accountant sees commercial accounting, ZATCA, KAS Suite & KAS Commercial
    expect(authService.isTabAuthorizedForUser(kasAccountant, 'smacc-accounting')).toBe(true);
    expect(authService.isTabAuthorizedForUser(kasAccountant, 'kas-suite')).toBe(true);
    expect(authService.isTabAuthorizedForUser(kasAccountant, 'kas-commercial')).toBe(true);

    // KAS Office helper only accesses Employee Self-Service (`profile`), never `settings` or `kas-suite`
    expect(authService.isTabAuthorizedForUser(kasOfficeHelper, 'profile')).toBe(true);
    expect(authService.isTabAuthorizedForUser(kasOfficeHelper, 'kas-suite')).toBe(false);
    expect(authService.isTabAuthorizedForUser(kasOfficeHelper, 'settings')).toBe(false);
  });

  it('provides KAS Trade Company with a 100% Commercial/Trade Chart of Accounts free of Musaned/Recruitment terms', () => {
    const kasAccounts = chartOfAccountsService.getAccountsByCompany('KAS');
    expect(kasAccounts.length).toBeGreaterThan(30);
    for (const acc of kasAccounts) {
      expect(acc.nameAr).not.toContain('مساند');
      expect(acc.nameAr).not.toContain('استقدام');
      expect(acc.nameAr).not.toContain('إيواء');
      expect(acc.nameAr).not.toContain('عمالة منزلية');
    }
  });

  it('activates Rental + Recruitment dual department access for Yaqoot Najd (.yaqoot) staff', () => {
    const yaqootManager = buildProfileForKasEmail('h.yousef.yaqoot@kas.sa');
    expect(yaqootManager.department_id).toBe('rental');
    expect(yaqootManager.default_tab).toBe('rent-contracts');
    expect(authService.isTabAuthorizedForUser(yaqootManager, 'rent-contracts')).toBe(true);
    expect(authService.isTabAuthorizedForUser(yaqootManager, 'rent-packages')).toBe(true);
    expect(authService.isTabAuthorizedForUser(yaqootManager, 'recruitment-contracts')).toBe(true);
    expect(authService.isTabAuthorizedForUser(yaqootManager, 'kas-suite')).toBe(false);
  });

  it('locks Drivers (.driver) to Travel/Airport tabs and Housing Cleaners to Self-Service Profile only', () => {
    const driver = buildProfileForKasEmail('a.hindi.driver@kas.sa');
    expect(authService.isTabAuthorizedForUser(driver, 'travel')).toBe(true);
    expect(authService.isTabAuthorizedForUser(driver, 'arrival-flights')).toBe(true);
    expect(authService.isTabAuthorizedForUser(driver, 'airport-reception')).toBe(true);
    expect(authService.isTabAuthorizedForUser(driver, 'room-management')).toBe(false);
    expect(authService.isTabAuthorizedForUser(driver, 'shelter-suite')).toBe(false);
    expect(authService.isTabAuthorizedForUser(driver, 'settings')).toBe(false);

    const cleaner = buildProfileForKasEmail('s.adebo.housing@kas.sa');
    expect(authService.isTabAuthorizedForUser(cleaner, 'profile')).toBe(true);
    expect(authService.isTabAuthorizedForUser(cleaner, 'shelter-suite')).toBe(false);
    expect(authService.isTabAuthorizedForUser(cleaner, 'settings')).toBe(false);
  });

  it('unlocks all advanced IFRS/SOCPA Finance routes for Recruitment Accountants and Legal Compliance for HR', () => {
    const safirAccountant = buildProfileForKasEmail('a.alkinani.acc@kas.sa');
    expect(authService.isTabAuthorizedForUser(safirAccountant, 'ifrs-engine')).toBe(true);
    expect(authService.isTabAuthorizedForUser(safirAccountant, 'period-closing')).toBe(true);
    expect(authService.isTabAuthorizedForUser(safirAccountant, 'musaned-escrow')).toBe(true);
    expect(authService.isTabAuthorizedForUser(safirAccountant, 'suppliers-agents')).toBe(true);
    expect(authService.isTabAuthorizedForUser(safirAccountant, 'eosb-zakat')).toBe(true);
    expect(authService.isTabAuthorizedForUser(safirAccountant, 'settings')).toBe(false);

    const hrDirector = buildProfileForKasEmail('hr@kas.sa');
    expect(authService.isTabAuthorizedForUser(hrDirector, 'employees')).toBe(true);
    expect(authService.isTabAuthorizedForUser(hrDirector, 'legal-compliance')).toBe(true);
    expect(authService.isTabAuthorizedForUser(hrDirector, 'settings')).toBe(false);

    const chairman = buildProfileForKasEmail('khalid@kas.sa');
    expect(authService.isAdmin(chairman)).toBe(true);
    expect(authService.isTabAuthorizedForUser(chairman, 'settings')).toBe(true);
    expect(authService.isTabAuthorizedForUser(chairman, 'kas-suite')).toBe(true);
  });
});
