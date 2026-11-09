import { describe, it, expect, beforeEach } from 'vitest';
import { realErpDataStore, setDataMode } from './realErpDataStore';

interface TestItem {
  id: string;
  name: string;
  count: number;
}

const MOCK_ITEMS: TestItem[] = [
  { id: 'item-1', name: 'Original Alpha', count: 10 },
  { id: 'item-2', name: 'Original Beta', count: 20 },
];

describe('realErpDataStore (Offline & LocalStorage Persistence)', () => {
  beforeEach(() => {
    localStorage.clear();
    setDataMode('demo_preview');
  });

  it('should return initial data when store is empty in demo mode', async () => {
    const data = await realErpDataStore.getRecords<TestItem>('test_entities', MOCK_ITEMS);
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe('Original Alpha');
  });

  it('should add a new record and persist it to store', async () => {
    const newRecord: TestItem = { id: 'item-3', name: 'New Gamma', count: 30 };
    const updated = await realErpDataStore.addRecord<TestItem>('test_entities', newRecord, MOCK_ITEMS);

    expect(updated).toHaveLength(3);
    expect(updated[0].name).toBe('New Gamma'); // newly added is prepended

    const reloaded = await realErpDataStore.getRecords<TestItem>('test_entities', MOCK_ITEMS);
    expect(reloaded).toHaveLength(3);
  });

  it('should update an existing record by id', async () => {
    const updatedList = await realErpDataStore.updateRecord<TestItem>(
      'test_entities',
      'item-1',
      { name: 'Updated Alpha Name', count: 99 },
      MOCK_ITEMS
    );

    const found = updatedList.find((i) => i.id === 'item-1');
    expect(found?.name).toBe('Updated Alpha Name');
    expect(found?.count).toBe(99);
  });

  it('should delete a record by id', async () => {
    const reducedList = await realErpDataStore.deleteRecord<TestItem>(
      'test_entities',
      'item-2',
      MOCK_ITEMS
    );

    expect(reducedList).toHaveLength(1);
    expect(reducedList.find((i) => i.id === 'item-2')).toBeUndefined();
  });
});
