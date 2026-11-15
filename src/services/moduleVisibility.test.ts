import { describe, it, expect, beforeEach } from 'vitest';
import type { NavItem } from '../types';
import {
  filterNavTree,
  computeBlockedHrefs,
  resolveEffectiveHiddenIds,
  collectDescendantIds,
  resolveUserVisibilityAccess,
  isVisibilityControllerUser,
  useModuleVisibilityStore,
} from './moduleVisibility';
import { SIDEBAR_MENU } from '../data/sidebarMenu';
import { authService, getFullStaffDirectory, type StaffDirectoryEntry, type UserProfile } from './authService';

function toUserProfile(entry: StaffDirectoryEntry): UserProfile {
  return {
    ...entry,
    status: 'نشط',
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

const MENU: NavItem[] = [
  { id: 'dashboard', title: 'الرئيسية', href: 'dashboard' },
  {
    id: 'dept-finance',
    title: 'المالية',
    href: 'finance-home',
    children: [
      { id: 'finance-home', title: 'الرئيسية المالية', href: 'finance-home' },
      { id: 'zatca', title: 'ZATCA', href: 'zatca' },
      {
        id: 'reports-group',
        title: 'التقارير',
        children: [{ id: 'trial-balance', title: 'ميزان المراجعة', href: 'trial-balance' }],
      },
    ],
  },
  {
    id: 'dept-exec',
    title: 'التنفيذية',
    href: 'settings',
    children: [
      { id: 'settings', title: 'الإعدادات', href: 'settings' },
      { id: 'module-visibility', title: 'إظهار وإخفاء', href: 'module-visibility' },
    ],
  },
];

describe('moduleVisibility — tree filtering', () => {
  it('returns the full menu when nothing is hidden', () => {
    expect(filterNavTree(MENU, new Set())).toEqual(MENU);
    expect(computeBlockedHrefs(MENU, new Set()).size).toBe(0);
  });

  it('hides a whole department including all descendants', () => {
    const filtered = filterNavTree(MENU, new Set(['dept-finance']));
    expect(filtered.map((i) => i.id)).toEqual(['dashboard', 'dept-exec']);
    const blocked = computeBlockedHrefs(MENU, new Set(['dept-finance']));
    expect([...blocked].sort()).toEqual(['finance-home', 'trial-balance', 'zatca']);
  });

  it('hides a single sub-page and keeps its siblings', () => {
    const filtered = filterNavTree(MENU, new Set(['zatca']));
    const finance = filtered.find((i) => i.id === 'dept-finance');
    expect(finance?.children?.map((c) => c.id)).toEqual(['finance-home', 'reports-group']);
    expect([...computeBlockedHrefs(MENU, new Set(['zatca']))]).toEqual(['zatca']);
  });

  it('hides nested parts (grandchildren)', () => {
    const filtered = filterNavTree(MENU, new Set(['trial-balance']));
    const finance = filtered.find((i) => i.id === 'dept-finance');
    // group with no remaining children disappears
    expect(finance?.children?.some((c) => c.id === 'reports-group')).toBe(false);
  });

  it('drops a department once all of its children are hidden', () => {
    const filtered = filterNavTree(MENU, new Set(['finance-home', 'zatca', 'reports-group']));
    expect(filtered.some((i) => i.id === 'dept-finance')).toBe(false);
  });

  it('never hides locked items (dashboard, visibility manager) — prevents admin lock-out', () => {
    const filtered = filterNavTree(MENU, new Set(['dashboard', 'dept-exec']));
    expect(filtered.some((i) => i.id === 'dashboard')).toBe(true);
    const exec = filtered.find((i) => i.id === 'dept-exec');
    expect(exec?.children?.map((c) => c.id)).toEqual(['module-visibility']);
    const blocked = computeBlockedHrefs(MENU, new Set(['dashboard', 'dept-exec']));
    expect(blocked.has('dashboard')).toBe(false);
    expect(blocked.has('module-visibility')).toBe(false);
  });

  it('collects descendant ids recursively', () => {
    expect(collectDescendantIds(MENU[1]).sort()).toEqual(
      ['finance-home', 'reports-group', 'trial-balance', 'zatca'].sort()
    );
  });
});

describe('moduleVisibility — rule layering', () => {
  const state = {
    orgRules: {
      ALL: { hiddenIds: ['zatca'] },
      KAS: { hiddenIds: ['dept-finance'] },
    },
    personalRules: { 'user-1': ['trial-balance'] },
  };

  it('merges group-wide, company and personal rules', () => {
    const ids = resolveEffectiveHiddenIds(state, 'KAS', 'user-1');
    expect([...ids].sort()).toEqual(['dept-finance', 'trial-balance', 'zatca']);
  });

  it('company rules apply only to that company', () => {
    const ids = resolveEffectiveHiddenIds(state, 'SAF', 'user-2');
    expect([...ids]).toEqual(['zatca']);
  });
});

describe('moduleVisibility & authService — HR Isolation & Abdulrahman Per-Employee Control', () => {
  beforeEach(() => {
    useModuleVisibilityStore.getState().clearEmployeeRule('hr@kas.sa');
    useModuleVisibilityStore.getState().clearEmployeeRule('a.alanazi@kas.sa');
  });

  it('hides Unified Gov Integration Hub and Finance Center completely from HR employees by default', () => {
    const staff = getFullStaffDirectory();
    const reemHr = toUserProfile(staff.find((u) => u.email?.toLowerCase() === 'hr@kas.sa')!);
    const aljouriHr = toUserProfile(staff.find((u) => u.email?.toLowerCase() === 'a.alanazi@kas.sa')!);

    expect(reemHr).toBeDefined();
    expect(reemHr.department_id).toBe('hr');
    expect(aljouriHr).toBeDefined();
    expect(aljouriHr.department_id).toBe('hr');

    for (const hrUser of [reemHr, aljouriHr]) {
      const access = resolveUserVisibilityAccess(SIDEBAR_MENU, hrUser);

      // Finance Center & Gov Integration Hub must be strictly blocked & absent from HR menu
      expect(access.visibleMenu.some((item) => item.id === 'dept-2-finance')).toBe(false);
      expect(access.blockedHrefs.has('gov-integrations')).toBe(true);
      expect(access.blockedHrefs.has('smacc-accounting')).toBe(true);
      expect(access.blockedHrefs.has('jisr-accruals')).toBe(true);
      expect(access.blockedHrefs.has('jisr-expenses')).toBe(true);

      expect(authService.isTabAuthorizedForUser(hrUser, 'gov-integrations')).toBe(false);
      expect(authService.isTabAuthorizedForUser(hrUser, 'government-hub')).toBe(false);
      expect(authService.isTabAuthorizedForUser(hrUser, 'smacc-accounting')).toBe(false);
      expect(authService.isTabAuthorizedForUser(hrUser, 'finance-home')).toBe(false);
      expect(authService.isTabAuthorizedForUser(hrUser, 'zatca')).toBe(false);
      expect(authService.isTabAuthorizedForUser(hrUser, 'jisr-accruals')).toBe(false);
      expect(authService.isTabAuthorizedForUser(hrUser, 'jisr-expenses')).toBe(false);

      // Core HR modules remain accessible
      expect(authService.isTabAuthorizedForUser(hrUser, 'employees')).toBe(true);
      expect(authService.isTabAuthorizedForUser(hrUser, 'jisr-welcome-signage')).toBe(true);
      expect(authService.isTabAuthorizedForUser(hrUser, 'payroll')).toBe(true);
    }
  });

  it('authorizes Abdulrahman (a.salif.dev@kas.sa) to customize section visibility per individual employee independently', () => {
    const staff = getFullStaffDirectory();
    const abdulrahman = toUserProfile(staff.find((u) => u.email?.toLowerCase() === 'a.salif.dev@kas.sa')!);
    const reemHr = toUserProfile(staff.find((u) => u.email?.toLowerCase() === 'hr@kas.sa')!);
    const aljouriHr = toUserProfile(staff.find((u) => u.email?.toLowerCase() === 'a.alanazi@kas.sa')!);

    expect(abdulrahman).toBeDefined();
    expect(isVisibilityControllerUser(abdulrahman)).toBe(true);
    expect(authService.canManageModuleVisibility(abdulrahman)).toBe(true);
    expect(authService.isTabAuthorizedForUser(abdulrahman, 'module-visibility')).toBe(true);

    // Abdulrahman grants Reem (hr@kas.sa) access to Gov Hub & Finance while hiding Payroll for Reem only
    useModuleVisibilityStore.getState().setEmployeeRule(
      'hr@kas.sa',
      {
        hiddenIds: ['payroll'],
        grantedIds: ['gov-integrations-exec', 'dept-2-finance'],
      },
      'a.salif.dev@kas.sa'
    );

    // Reem immediately reflects the custom per-employee overrides
    expect(authService.isTabAuthorizedForUser(reemHr, 'gov-integrations')).toBe(true);
    expect(authService.isTabAuthorizedForUser(reemHr, 'smacc-accounting')).toBe(true);
    expect(authService.isTabAuthorizedForUser(reemHr, 'payroll')).toBe(false);

    // Aljouri (another HR employee) remains completely isolated and unaffected!
    expect(authService.isTabAuthorizedForUser(aljouriHr, 'gov-integrations')).toBe(false);
    expect(authService.isTabAuthorizedForUser(aljouriHr, 'smacc-accounting')).toBe(false);
    expect(authService.isTabAuthorizedForUser(aljouriHr, 'payroll')).toBe(true);

    // Clearing Reem's override restores default HR isolation
    useModuleVisibilityStore.getState().clearEmployeeRule('hr@kas.sa');
    expect(authService.isTabAuthorizedForUser(reemHr, 'gov-integrations')).toBe(false);
    expect(authService.isTabAuthorizedForUser(reemHr, 'smacc-accounting')).toBe(false);
    expect(authService.isTabAuthorizedForUser(reemHr, 'payroll')).toBe(true);
  });
});
