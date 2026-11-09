import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ErpTableName,
  ListOptions,
} from '../../services/erpSupabaseService';
import { useCompany } from '../../contexts/CompanyContext';
import { dataIsolationService } from '../../services/dataIsolationService';
import { enforceCompanyScope } from '../../services/companyDataGuard';
import {
  MOCK_CLIENTS,
  MOCK_ORDERS,
  MOCK_RECRUITMENT_CONTRACTS,
  MOCK_RENT_CONTRACTS,
  MOCK_SHELTER_ITEMS,
  MOCK_EMPLOYEES,
} from '../../data/mockData';

import { realErpDataStore, getDataMode } from '../../services/realErpDataStore';

// --- Generic Table Hook with Tenant-Isolated Cache Key and Strict Company Filtering ---
export function useTableData<T = Record<string, unknown>>(
  tableName: ErpTableName,
  options: ListOptions = {},
  fallbackData: T[] = []
) {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();
  const effectiveCompanyId = options.companyId || activeCompanyId || 'SAF';
  const scopedCacheKey = dataIsolationService.getScopedCacheKey(
    effectiveCompanyId,
    tableName,
    JSON.stringify(options)
  );

  useEffect(() => {
    const handleRefresh = () => {
      queryClient.invalidateQueries({ queryKey: [scopedCacheKey] });
    };
    window.addEventListener('erp-data-updated', handleRefresh);
    return () => window.removeEventListener('erp-data-updated', handleRefresh);
  }, [queryClient, scopedCacheKey]);

  return useQuery({
    queryKey: [scopedCacheKey, tableName, effectiveCompanyId, getDataMode()],
    queryFn: async () => {
      const isExplicitlyPurged =
        typeof window !== 'undefined' &&
        localStorage.getItem('ALSULAIM_ERP_EXPLICIT_PURGE') === 'true';
      const effectiveFallback = isExplicitlyPurged ? [] : fallbackData;
      const records = await realErpDataStore.getRecords<any>(
        tableName,
        effectiveFallback,
        effectiveCompanyId
      );
      if (effectiveCompanyId && effectiveCompanyId !== 'all' && records.length > 0) {
        return records.filter((item: Record<string, unknown>) => {
          const itemCompany = item.company_id || item.companyId;
          return !itemCompany || itemCompany === effectiveCompanyId || itemCompany === 'all';
        }) as T[];
      }
      return records as T[];
    },
  });
}

// --- Specific Entity Query Hooks ---

export function useClients(options: ListOptions = {}) {
  return useTableData('clients', options, MOCK_CLIENTS);
}

export function useOrders(options: ListOptions = {}) {
  return useTableData('orders', options, MOCK_ORDERS);
}

export function useRecruitmentContracts(options: ListOptions = {}) {
  return useTableData('contracts', options, MOCK_RECRUITMENT_CONTRACTS);
}

export function useRentContracts(options: ListOptions = {}) {
  return useTableData('rent_contracts', options, MOCK_RENT_CONTRACTS);
}

export function useShelterRecords(options: ListOptions = {}) {
  return useTableData('shelter_records', options, MOCK_SHELTER_ITEMS);
}

export function useEmployees(options: ListOptions = {}) {
  return useTableData('employees', options, MOCK_EMPLOYEES);
}

export function useComplaints(options: ListOptions = {}) {
  return useTableData('complaints', options, []);
}

export function useAttendances(options: ListOptions = {}) {
  return useTableData('attendances', options, []);
}

export function useCustodies(options: ListOptions = {}) {
  return useTableData('custodies', options, []);
}

export function useCostCenters(options: ListOptions = {}) {
  return useTableData('cost_centers', options, []);
}

export function useJournals(options: ListOptions = {}) {
  return useTableData('company_journal_entries', options, []);
}

export function useZatcaInvoices(options: ListOptions = {}) {
  return useTableData('zatca_invoices', options, []);
}

export function useVouchers(options: ListOptions = {}) {
  return useTableData('vouchers', options, []);
}

// --- Generic Mutation Hook for Real-time Tenant-Scoped CRUD ---
export function useTableMutation<T = Record<string, any>>(tableName: ErpTableName) {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();

  const createItem = useMutation({
    mutationFn: async (newRecord: Record<string, any>) => {
      const targetCompany = activeCompanyId === 'all' ? 'SAF' : activeCompanyId;
      const scopedPayload = enforceCompanyScope(newRecord, targetCompany);
      const recordWithId = {
        id: (scopedPayload.id as string) || `${tableName.slice(0, 3).toUpperCase()}-${Date.now()}`,
        created_at: (scopedPayload.created_at as string) || new Date().toISOString(),
        ...scopedPayload,
      };
      await realErpDataStore.addRecord(tableName, recordWithId);
      return recordWithId as unknown as T;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey.includes(tableName),
      });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: Record<string, any> }) => {
      await realErpDataStore.updateRecord(tableName, id, data);
      return { id, ...data } as unknown as T;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey.includes(tableName),
      });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string | number) => {
      await realErpDataStore.deleteRecord(tableName, id);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey.includes(tableName),
      });
    },
  });

  return {
    createItem,
    updateItem,
    deleteItem,
  };
}
