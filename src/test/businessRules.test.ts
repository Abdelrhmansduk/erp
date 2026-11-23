import { describe, it, expect } from 'vitest';
import {
  DASHBOARD_STATS_BY_PERIOD,
  MOCK_CLIENTS,
  MOCK_ORDERS,
  MOCK_RECRUITMENT_CONTRACTS,
  MOCK_RENT_CONTRACTS,
  MOCK_SHELTER_ITEMS,
} from '../data/mockData';

describe('Business Rules & Clean Production Zero-Demo Invariants', () => {
  it('should start with zero synthetic demo records in default production seeds', () => {
    expect(MOCK_CLIENTS).toHaveLength(0);
    expect(MOCK_ORDERS).toHaveLength(0);
    expect(MOCK_RECRUITMENT_CONTRACTS).toHaveLength(0);
    expect(MOCK_RENT_CONTRACTS).toHaveLength(0);
    expect(MOCK_SHELTER_ITEMS).toHaveLength(0);
  });

  it('should maintain mathematical consistency across KPI timeframes', () => {
    const today = DASHBOARD_STATS_BY_PERIOD.today;
    const week = DASHBOARD_STATS_BY_PERIOD.week;
    const month = DASHBOARD_STATS_BY_PERIOD.month;
    const all = DASHBOARD_STATS_BY_PERIOD.all;

    expect(today.recruitmentContracts.total).toBeLessThanOrEqual(week.recruitmentContracts.total);
    expect(week.recruitmentContracts.total).toBeLessThanOrEqual(month.recruitmentContracts.total);
    expect(month.recruitmentContracts.total).toBeLessThanOrEqual(all.recruitmentContracts.total);

    expect(today.orders.total).toBeLessThanOrEqual(week.orders.total);
    expect(week.orders.total).toBeLessThanOrEqual(month.orders.total);
  });

  it('should verify shelter accommodation sub-status sum does not exceed total inside shelter', () => {
    const shelterKpi = DASHBOARD_STATS_BY_PERIOD.today.shelter;
    expect(shelterKpi.total).toBeGreaterThanOrEqual(shelterKpi.inside);
    expect(shelterKpi.inside).toBe(0);
  });
});
