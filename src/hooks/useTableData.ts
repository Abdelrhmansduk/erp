import { useState, useCallback } from 'react';
import { getTableRecords, insertTableRecord, updateTableRecord, deleteTableRecord } from '../services/erpSupabaseService';

export function useTableData<T>(tableName: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = useCallback(async (options: any = {}) => {
    setLoading(true);
    setError(null);
    try {
      const { data, count } = await getTableRecords(tableName, options);
      setData(data as T[]);
      setTotalCount(count || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  const addRecord = async (record: Record<string, any>) => {
    const newRecord = await insertTableRecord(tableName, record);
    setData(prev => [newRecord as T, ...prev]);
    return newRecord;
  };

  const updateRecord = async (id: string | number, record: Record<string, any>) => {
    const updatedRecord = await updateTableRecord(tableName, id, record);
    setData(prev => prev.map(item => (item as any).id === id ? updatedRecord as T : item));
    return updatedRecord;
  };

  const deleteRecord = async (id: string | number) => {
    await deleteTableRecord(tableName, id);
    setData(prev => prev.filter(item => (item as any).id !== id));
  };

  return { data, loading, error, totalCount, fetchData, addRecord, updateRecord, deleteRecord };
}
