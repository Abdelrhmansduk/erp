import { describe, it, expect } from 'vitest';
import type { NavItem } from '../types';
import {
  filterNavTree,
  computeBlockedHrefs,
  resolveEffectiveHiddenIds,
  collectDescendantIds,
} from './moduleVisibility';

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
