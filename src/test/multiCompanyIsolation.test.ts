import { describe, it, expect } from 'vitest';
import { SIDEBAR_MENU } from '../data/sidebarMenu';
import { NavItem } from '../types';
import { KAS_DEPARTMENTS, KAS_BRANCHES } from '../components/kas/KasNavigationSidebar';

describe('Multi-Company Isolation & KAS Standalone Security', () => {
  it('should verify KAS items in SIDEBAR_MENU have exclusiveToCompany set to KAS', () => {
    const findKasItems = (items: NavItem[]): NavItem[] => {
      let found: NavItem[] = [];
      for (const item of items) {
        if (item.exclusiveToCompany === 'KAS') {
          found.push(item);
        }
        if (item.children) {
          found = found.concat(findKasItems(item.children));
        }
      }
      return found;
    };

    const kasItems = findKasItems(SIDEBAR_MENU);
    expect(kasItems.length).toBeGreaterThanOrEqual(3);

    const ids = kasItems.map(i => i.id);
    expect(ids).toContain('kas-suite');
    expect(ids).toContain('tenders-boq');
    expect(ids).toContain('kas-etmad');
  });

  it('should completely exclude KAS items when active company is recruitment (SAF / YAQ / TOP)', () => {
    const isCompanyMatch = (item: NavItem, activeCompanyCode: string): boolean => {
      if (!item.exclusiveToCompany) return true;
      if (item.exclusiveToCompany === 'KAS') {
        return activeCompanyCode.toUpperCase() === 'KAS';
      }
      return activeCompanyCode.toUpperCase() === item.exclusiveToCompany.toUpperCase();
    };

    const filterMenuForCompany = (items: NavItem[], activeCompanyCode: string): NavItem[] => {
      return items
        .filter(item => isCompanyMatch(item, activeCompanyCode))
        .map(item => {
          if (item.children) {
            return { ...item, children: filterMenuForCompany(item.children, activeCompanyCode) };
          }
          return item;
        });
    };

    // Test for SAF (الصفا الماسي)
    const safMenu = filterMenuForCompany(SIDEBAR_MENU, 'SAF');
    const safKasItems = safMenu.flatMap(i => (i.children || [])).filter(i => i.id === 'tenders-boq' || i.id === 'kas-etmad' || i.id === 'kas-suite');
    expect(safKasItems.length).toBe(0);

    // Test for YAQ (الياقوت الشرقية)
    const yaqMenu = filterMenuForCompany(SIDEBAR_MENU, 'YAQ');
    const yaqKasItems = yaqMenu.flatMap(i => (i.children || [])).filter(i => i.id === 'tenders-boq' || i.id === 'kas-etmad' || i.id === 'kas-suite');
    expect(yaqKasItems.length).toBe(0);

    // Test for TOP (توب تالنت)
    const topMenu = filterMenuForCompany(SIDEBAR_MENU, 'TOP');
    const topKasItems = topMenu.flatMap(i => (i.children || [])).filter(i => i.id === 'tenders-boq' || i.id === 'kas-etmad' || i.id === 'kas-suite');
    expect(topKasItems.length).toBe(0);
  });

  it('should include KAS items when active company is KAS', () => {
    const isCompanyMatch = (item: NavItem, activeCompanyCode: string): boolean => {
      if (!item.exclusiveToCompany) return true;
      if (item.exclusiveToCompany === 'KAS') {
        return activeCompanyCode.toUpperCase() === 'KAS';
      }
      return activeCompanyCode.toUpperCase() === item.exclusiveToCompany.toUpperCase();
    };

    const filterMenuForCompany = (items: NavItem[], activeCompanyCode: string): NavItem[] => {
      return items
        .filter(item => isCompanyMatch(item, activeCompanyCode))
        .map(item => {
          if (item.children) {
            return { ...item, children: filterMenuForCompany(item.children, activeCompanyCode) };
          }
          return item;
        });
    };

    const kasMenu = filterMenuForCompany(SIDEBAR_MENU, 'KAS');
    const kasItems = kasMenu.flatMap(i => (i.children || [])).filter(i => i.id === 'tenders-boq' || i.id === 'kas-etmad' || i.id === 'kas-suite');
    expect(kasItems.length).toBe(3);
  });

  it('should verify KAS standalone portal has 9 distinct specialized departments', () => {
    expect(KAS_DEPARTMENTS.length).toBe(9);

    const deptIds = KAS_DEPARTMENTS.map(d => d.id);
    expect(deptIds).toContain('command-center');
    expect(deptIds).toContain('monafasat');
    expect(deptIds).toContain('boq-editor');
    expect(deptIds).toContain('suppliers');
    expect(deptIds).toContain('purchase-orders');
    expect(deptIds).toContain('contracts-projects');
    expect(deptIds).toContain('zatca-invoices');
    expect(deptIds).toContain('etmad-cloud-api');
    expect(deptIds).toContain('audit-security');

    expect(KAS_BRANCHES.length).toBeGreaterThanOrEqual(3);
  });
});
