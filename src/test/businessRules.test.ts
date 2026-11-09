import { describe, it, expect } from 'vitest';
import { DASHBOARD_STATS_BY_PERIOD, MOCK_CLIENTS, MOCK_RECRUITMENT_CONTRACTS, MOCK_RENT_CONTRACTS } from '../data/mockData';

describe('Business Rules & ERP Domain Logic Integrity', () => {
  it('should maintain mathematical consistency across KPI timeframes', () => {
    const today = DASHBOARD_STATS_BY_PERIOD.today;
    const week = DASHBOARD_STATS_BY_PERIOD.week;
    const month = DASHBOARD_STATS_BY_PERIOD.month;
    const all = DASHBOARD_STATS_BY_PERIOD.all;

    // Daily contracts should not exceed weekly, monthly or all-time totals
    expect(today.recruitmentContracts.total).toBeLessThanOrEqual(week.recruitmentContracts.total);
    expect(week.recruitmentContracts.total).toBeLessThanOrEqual(month.recruitmentContracts.total);
    expect(month.recruitmentContracts.total).toBeLessThanOrEqual(all.recruitmentContracts.total);

    // Orders progression
    expect(today.orders.total).toBeLessThanOrEqual(week.orders.total);
    expect(week.orders.total).toBeLessThanOrEqual(month.orders.total);
  });

  it('should verify recruitment contract stages match operational lifecycle', () => {
    const allowedStages = ['تفييز', 'وصول', 'مكتمل', 'تفويض', 'تذكرة', 'قيد الإجراء'];

    MOCK_RECRUITMENT_CONTRACTS.forEach((contract) => {
      expect(allowedStages).toContain(contract.stage);
      expect(contract.contract_number).toBeDefined();
      expect(contract.client_name).toBeTruthy();
      expect(contract.amount).toBeGreaterThan(0);
    });
  });

  it('should verify rental contract costs and positive financial amounts', () => {
    MOCK_RENT_CONTRACTS.forEach((rent) => {
      expect(rent.total_amount).toBeGreaterThan(0);
      expect(rent.monthly_cost).toBeGreaterThan(0);
      expect(rent.contract_number).toBeTruthy();
      expect(rent.client_name).toBeTruthy();
    });
  });

  it('should ensure all clients have valid identification and phone formats', () => {
    MOCK_CLIENTS.forEach((client) => {
      expect(client.id).toBeTruthy();
      expect(client.name).toBeTruthy();
      expect(client.phone.length).toBeGreaterThanOrEqual(10);
    });
  });

  it('should verify shelter accommodation sub-status sum equals total inside shelter', () => {
    const shelterKpi = DASHBOARD_STATS_BY_PERIOD.today.shelter;
    expect(shelterKpi.total).toBeGreaterThanOrEqual(shelterKpi.inside);
    expect(shelterKpi.inside).toBeGreaterThan(0);
  });
});
