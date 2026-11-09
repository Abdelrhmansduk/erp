import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DataTable, Column } from './DataTable';

interface SampleRow {
  id: string;
  name: string;
  role: string;
}

const SAMPLE_DATA: SampleRow[] = [
  { id: '1', name: 'أحمد علي', role: 'مدير عمليات' },
  { id: '2', name: 'سارة خالد', role: 'خدمة عملاء' },
];

const COLUMNS: Column<SampleRow>[] = [
  { header: 'الاسم', accessor: 'name' },
  { header: 'الدور', accessor: 'role' },
];

describe('DataTable Component', () => {
  it('should render table headers and data rows correctly', () => {
    render(<DataTable columns={COLUMNS} data={SAMPLE_DATA} />);

    expect(screen.getByText('الاسم')).toBeDefined();
    expect(screen.getByText('الدور')).toBeDefined();
    expect(screen.getByText('أحمد علي')).toBeDefined();
    expect(screen.getByText('سارة خالد')).toBeDefined();
  });

  it('should filter rows based on search input', () => {
    render(<DataTable columns={COLUMNS} data={SAMPLE_DATA} searchPlaceholder="ابحث بالاسم..." />);

    const searchInput = screen.getByPlaceholderText('ابحث بالاسم...');
    fireEvent.change(searchInput, { target: { value: 'سارة' } });

    expect(screen.getByText('سارة خالد')).toBeDefined();
    expect(screen.queryByText('أحمد علي')).toBeNull();
  });

  it('should render empty state when no data matches filter', () => {
    render(<DataTable columns={COLUMNS} data={SAMPLE_DATA} searchPlaceholder="ابحث بالاسم..." />);

    const searchInput = screen.getByPlaceholderText('ابحث بالاسم...');
    fireEvent.change(searchInput, { target: { value: 'شخص غير موجود' } });

    expect(screen.getByText('لا توجد نتائج مطابقة لخيارات البحث أو التصفية')).toBeDefined();
  });
});
