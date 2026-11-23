import { Client, Order, RecruitmentContract, RentContract, ShelterItem, Employee } from '../types';

export interface DashboardKPIPeriodData {
  recruitmentContracts: { total: number; beforeArrival: number; arrivalStage: number; underGuarantee: number; active: number; completed: number; returned: number; dispatches: number };
  orders: { total: number; newOrders: number; inProgress: number; completed: number; cancelled: number };
  rentContracts: { total: number; active: number; sent: number; locked: number; delivered: number; completed: number };
  rentMaids: { total: number; available: number; activeRent: number };
  cvs: { total: number; available: number; reserved: number; rental: number; deleted: number; pending: number };
  clients: { total: number; withOrders: number; withoutOrders: number };
  ingaz: { total: number; inProgress: number; approved: number };
  complaints: { total: number; open: number; closed: number };
  sponsorshipTransfers: { total: number; trialPeriod: number; transferred: number };
  shelter: { total: number; inside: number; outside: number; availableTransfer: number; deportation: number };
  todayContractsCount: number;
  todayOrdersCount: number;
}

const ZERO_PERIOD_STATS: DashboardKPIPeriodData = {
  recruitmentContracts: { total: 0, beforeArrival: 0, arrivalStage: 0, underGuarantee: 0, active: 0, completed: 0, returned: 0, dispatches: 0 },
  orders: { total: 0, newOrders: 0, inProgress: 0, completed: 0, cancelled: 0 },
  rentContracts: { total: 0, active: 0, sent: 0, locked: 0, delivered: 0, completed: 0 },
  rentMaids: { total: 0, available: 0, activeRent: 0 },
  cvs: { total: 0, available: 0, reserved: 0, rental: 0, deleted: 0, pending: 0 },
  clients: { total: 0, withOrders: 0, withoutOrders: 0 },
  ingaz: { total: 0, inProgress: 0, approved: 0 },
  complaints: { total: 0, open: 0, closed: 0 },
  sponsorshipTransfers: { total: 0, trialPeriod: 0, transferred: 0 },
  shelter: { total: 0, inside: 0, outside: 0, availableTransfer: 0, deportation: 0 },
  todayContractsCount: 0,
  todayOrdersCount: 0,
};

export const DASHBOARD_STATS_BY_PERIOD: Record<'today' | 'week' | 'month' | 'all', DashboardKPIPeriodData> = {
  today: { ...ZERO_PERIOD_STATS },
  week: { ...ZERO_PERIOD_STATS },
  month: { ...ZERO_PERIOD_STATS },
  all: { ...ZERO_PERIOD_STATS },
};

export const MOCK_CLIENTS: Client[] = [];

export const MOCK_ORDERS: Order[] = [];

export const MOCK_RECRUITMENT_CONTRACTS: RecruitmentContract[] = [];

export const MOCK_RENT_CONTRACTS: RentContract[] = [];

export const MOCK_SHELTER_ITEMS: ShelterItem[] = [];

export const MOCK_EMPLOYEES: Employee[] = [];
