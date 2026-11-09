import { describe, it, expect } from 'vitest';
import {
  autoMapColumns,
  validateImportData,
  executeImport,
  IMPORT_TEMPLATES,
} from './importEngine';

describe('Enterprise Data Import Engine', () => {
  const clientTemplate = IMPORT_TEMPLATES.find((t) => t.entityKey === 'clients')!;

  it('should find matching import templates for all major ERP modules', () => {
    expect(IMPORT_TEMPLATES.length).toBeGreaterThan(5);
    expect(clientTemplate).toBeDefined();
    expect(clientTemplate.fields.some((f) => f.systemField === 'name')).toBe(true);
    expect(clientTemplate.fields.some((f) => f.systemField === 'phone')).toBe(true);
  });

  it('should automatically map Arabic synonym headers to internal system fields', () => {
    const fileHeaders = ['اسم العميل', 'رقم الجوال', 'البريد الإلكتروني', 'المدينة'];
    const mappings = autoMapColumns(fileHeaders, clientTemplate);

    const nameMapping = mappings.find((m) => m.systemField === 'name');
    const phoneMapping = mappings.find((m) => m.systemField === 'phone');
    const emailMapping = mappings.find((m) => m.systemField === 'email');

    expect(nameMapping?.fileColumn).toBe('اسم العميل');
    expect(phoneMapping?.fileColumn).toBe('رقم الجوال');
    expect(emailMapping?.fileColumn).toBe('البريد الإلكتروني');
  });

  it('should validate rows and flag missing required fields', () => {
    const rawRows = [
      { 'اسم العميل': 'سلطان القحطاني', 'رقم الجوال': '0555123456' },
      { 'اسم العميل': '', 'رقم الجوال': '0555999888' }, // Missing name
    ];

    const mappings = [
      { fileColumn: 'اسم العميل', systemField: 'name' },
      { fileColumn: 'رقم الجوال', systemField: 'phone' },
    ];

    const result = validateImportData(rawRows, mappings, clientTemplate);

    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].name).toBe('سلطان القحطاني');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('مطلوب');
  });

  it('should execute batch imports and persist imported records', async () => {
    const validRows = [
      { id: 'cli-test-1', name: 'العميل المستورد 1', phone: '0551111111' },
      { id: 'cli-test-2', name: 'العميل المستورد 2', phone: '0552222222' },
    ];

    const importResult = await executeImport(validRows, 'test_imported_clients');

    expect(importResult.total).toBe(2);
    expect(importResult.imported).toBe(2);
    expect(importResult.failed).toBe(0);
  });
});
