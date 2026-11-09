import React, { useState } from 'react';
import { exportData, ExportFormat } from '../../services/exportService';
import { ExportDropdown } from '../common/ExportDropdown';
import { useAppStore } from '../../stores/appStore';
import { IMPORT_TEMPLATES, downloadTemplate } from '../../services/importEngine';
import { BusinessIllustration } from '../common/BusinessIllustration';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  width?: string;
}

export interface ExportConfig {
  /** Key matching SECTION_CONFIGS in exportService */
  sectionKey: string;
  /** Raw data array (not filtered) — filtered data is used when search is active */
  rawData: any[];
  /** Optional custom title for exported report */
  customTitle?: string;
}

export interface TableImportConfig {
  /** Entity key matching IMPORT_TEMPLATES in importEngine */
  entityKey?: string;
  /** Custom callback for import */
  onImportClick?: () => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  onAddClick?: () => void;
  addLabel?: string;
  filterContent?: React.ReactNode;
  /** Export configuration — enables Excel/PDF/CSV/Print buttons */
  exportConfig?: ExportConfig;
  /** Import configuration — enables Excel/CSV/JSON import and template download */
  importConfig?: TableImportConfig;
}

type TableDensity = 'comfortable' | 'standard' | 'compact';
const TABLE_DENSITY_KEY = 'alsulaim_table_density_v1';

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  searchPlaceholder = 'ابحث في البيانات...',
  onAddClick,
  addLabel = 'إضافة جديد',
  filterContent,
  exportConfig,
  importConfig,
}: DataTableProps<T>) {
  const { setActiveTab } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [density, setDensity] = useState<TableDensity>(() => {
    try {
      const saved = localStorage.getItem(TABLE_DENSITY_KEY) as TableDensity | null;
      if (saved === 'comfortable' || saved === 'standard' || saved === 'compact') {
        return saved;
      }
      return 'standard';
    } catch {
      return 'standard';
    }
  });

  const handleDensityChange = (next: TableDensity) => {
    setDensity(next);
    try {
      localStorage.setItem(TABLE_DENSITY_KEY, next);
    } catch {
      // ignore
    }
  };

  const cellPadding =
    density === 'compact' ? '8px 12px' : density === 'comfortable' ? '16px 18px' : '12px 16px';
  const cellFontSize =
    density === 'compact' ? '12.5px' : density === 'comfortable' ? '14px' : '13.5px';

  // Find matching import template if entityKey provided or derived from exportConfig
  const effectiveEntityKey = importConfig?.entityKey || exportConfig?.sectionKey;
  const matchingTemplate = effectiveEntityKey
    ? IMPORT_TEMPLATES.find(
        (t) =>
          t.entityKey === effectiveEntityKey ||
          t.entityKey === effectiveEntityKey.replace(/-/g, '_')
      )
    : undefined;

  const filteredData = data.filter((row) => {
    if (!searchQuery) return true;
    return JSON.stringify(row).toLowerCase().includes(searchQuery.toLowerCase());
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map((r) => r.id)));
    }
  };

  const toggleSelectRow = (id: string | number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  /** Get data for export: use selected rows if any, otherwise filtered data or raw data */
  const getExportData = (): any[] => {
    if (selectedIds.size > 0) {
      return filteredData.filter((r) => selectedIds.has(r.id)) as any[];
    }
    if (exportConfig) {
      return searchQuery ? (filteredData as any[]) : exportConfig.rawData;
    }
    return filteredData as any[];
  };

  const handleExport = (format: ExportFormat) => {
    const sectionKey = exportConfig ? exportConfig.sectionKey : 'general_data';
    const exportRows = getExportData();
    exportData(sectionKey, exportRows, format);
    setShowExportMenu(false);
  };

  return (
    <div
      className="card-pricing"
      style={{
        padding: 0,
        overflow: 'hidden',
        borderRadius: '16px',
        border: '1px solid #e4e4e7',
        background: '#ffffff',
        position: 'relative',
      }}
    >
      {/* Table Toolbar Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid #e4e4e7',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <i
              className="fa-solid fa-magnifying-glass"
              style={{ position: 'absolute', right: '14px', color: '#71717a', fontSize: '13px' }}
            ></i>
            <input
              type="text"
              className="text-input"
              style={{
                borderRadius: '9999px',
                paddingRight: '36px',
                paddingLeft: '32px',
                height: '38px',
                minHeight: '38px',
                width: '260px',
                fontSize: '13px',
              }}
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <i
                className="fa-solid fa-xmark"
                style={{
                  position: 'absolute',
                  left: '12px',
                  color: '#71717a',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
                onClick={() => setSearchQuery('')}
              ></i>
            )}
          </div>

          {filterContent && (
            <button
              className={showFilters ? 'button-primary-pill' : 'button-outline-on-light'}
              style={{ fontSize: '13px', padding: '6px 14px', minHeight: '38px' }}
              onClick={() => setShowFilters(!showFilters)}
            >
              <i className="fa-solid fa-filter"></i>
              <span>تصفية مفرزة</span>
              {showFilters ? (
                <i className="fa-solid fa-chevron-up"></i>
              ) : (
                <i className="fa-solid fa-chevron-down"></i>
              )}
            </button>
          )}

          {/* Row Density Switcher */}
          <div
            className="hidden md:inline-flex items-center rounded-full bg-zinc-100 p-0.5 border border-zinc-200"
            title="التحكم في كثافة صفوف الجدول"
          >
            {(
              [
                { id: 'comfortable', label: 'مريح' },
                { id: 'standard', label: 'قياسي' },
                { id: 'compact', label: 'مضغوط' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleDensityChange(opt.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  density === opt.id
                    ? 'bg-[#f3f3f3] text-[#141414] shadow-2xs'
                    : 'text-zinc-600 hover:text-[#141414]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {selectedIds.size > 0 && (
            <div className="inline-flex items-center gap-1.5 bg-[#f3f3f3] text-[#141414] px-3 py-1.5 rounded-full text-xs font-bold border border-[#e0e0e0]">
              <span className="text-[#141414] font-bold">محدد ({selectedIds.size})</span>
              <button
                type="button"
                onClick={() => handleExport('excel')}
                className="px-2 py-0.5 rounded-full bg-[#f3f3f3] hover:bg-[#f3f3f3] text-[11px] text-[#141414] cursor-pointer"
              >
                Excel
              </button>
              <button
                type="button"
                onClick={() => handleExport('pdf')}
                className="px-2 py-0.5 rounded-full bg-[#f3f3f3] hover:bg-[#f3f3f3] text-[11px] text-[#141414] cursor-pointer"
              >
                PDF
              </button>
              <button
                type="button"
                onClick={() => handleExport('word')}
                className="px-2 py-0.5 rounded-full bg-[#f3f3f3] hover:bg-[#f3f3f3] text-[11px] text-[#141414] cursor-pointer"
              >
                Word
              </button>
              <button
                type="button"
                onClick={() => handleExport('wps')}
                className="px-2 py-0.5 rounded-full bg-[#f3f3f3] hover:bg-[#eaeaea] text-[11px] text-[#141414] cursor-pointer"
              >
                WPS
              </button>
              <button
                type="button"
                onClick={() => handleExport('print')}
                className="px-2 py-0.5 rounded-full bg-[#f3f3f3] hover:bg-[#f3f3f3] text-[11px] text-[#141414] cursor-pointer"
              >
                طباعة
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="px-1.5 py-0.5 rounded-full text-[#141414] hover:bg-[#e0e0e0] text-[11px] cursor-pointer"
                title="إلغاء التحديد"
                aria-label="إلغاء التحديد"
              >
                ✕
              </button>
            </div>
          )}

          {/* Import Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className="button-outline-on-light"
              style={{ fontSize: '13px', padding: '6px 14px', minHeight: '38px' }}
              title="استيراد البيانات من Excel / CSV / PDF"
              onClick={() => {
                setShowImportMenu(!showImportMenu);
                setShowExportMenu(false);
              }}
            >
              <i className="fa-solid fa-file-import"></i>
              <span>استيراد</span>
              <i
                className={`fa-solid fa-chevron-${showImportMenu ? 'up' : 'down'}`}
                style={{ fontSize: '9px', opacity: 0.7 }}
              ></i>
            </button>

            {showImportMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '110%',
                  left: 0,
                  background: '#ffffff',
                  border: '1px solid #e4e4e7',
                  borderRadius: '12px',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
                  zIndex: 50,
                  minWidth: '240px',
                  overflow: 'hidden',
                  fontFamily: 'var(--font-family-ui)',
                  padding: '6px',
                }}
              >
                <button
                  onClick={() => {
                    setShowImportMenu(false);
                    window.dispatchEvent(new CustomEvent('open-universal-extractor'));
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'right',
                    border: 'none',
                    borderRadius: '8px',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#141414',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f4f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: '14px', color: '#141414' }}></i>
                  <span>استخلاص ذكي (PDF / صور / Excel)</span>
                </button>

                <button
                  onClick={() => {
                    setShowImportMenu(false);
                    if (importConfig?.onImportClick) {
                      importConfig.onImportClick();
                    } else {
                      setActiveTab('data-import', 'معالج استيراد البيانات الشامل (Excel / CSV)');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'right',
                    border: 'none',
                    borderRadius: '8px',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#141414',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f4f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <i className="fa-solid fa-file-arrow-up" style={{ fontSize: '14px' }}></i>
                  <span>معالج الاستيراد (Excel / CSV)</span>
                </button>

                {matchingTemplate && (
                  <button
                    onClick={() => {
                      downloadTemplate(matchingTemplate);
                      setShowImportMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'right',
                      border: 'none',
                      borderRadius: '8px',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#141414',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f4f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <i className="fa-solid fa-download"></i>
                    <span>تحميل قالب Excel فارغ</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Export Dropdown - 10 Professional Formats */}
          <ExportDropdown
            sectionKey={exportConfig ? exportConfig.sectionKey : 'general_data'}
            data={getExportData()}
            customTitle={exportConfig?.customTitle}
            buttonLabel="تصدير"
            variant="outline-light"
          />

          {onAddClick && (
            <button
              className="button-primary-pill"
              style={{ fontSize: '13px', padding: '6px 18px', minHeight: '38px' }}
              onClick={onAddClick}
            >
              <i className="fa-solid fa-plus"></i>
              <span>{addLabel}</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter Content */}
      {showFilters && filterContent && (
        <div
          style={{
            padding: '16px 20px',
            background: '#fafafa',
            borderBottom: '1px solid #e4e4e7',
          }}
        >
          {filterContent}
        </div>
      )}

      {/* Main Table */}
      <div style={{ overflowX: 'auto', width: '100%', maxHeight: '72vh' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'right',
            fontFamily: 'var(--font-family-ui)',
          }}
        >
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr style={{ background: '#fafafa', borderBottom: '1px solid #e4e4e7' }}>
              <th style={{ width: '44px', textAlign: 'center', padding: cellPadding }}>
                <input
                  type="checkbox"
                  checked={filteredData.length > 0 && selectedIds.size === filteredData.length}
                  onChange={toggleSelectAll}
                  style={{ cursor: 'pointer', accentColor: '#141414' }}
                />
              </th>
              {columns.map((col, index) => (
                <th
                  key={index}
                  style={{
                    width: col.width,
                    padding: cellPadding,
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#52525b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.2px',
                    background: '#fafafa',
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  style={{ textAlign: 'center', padding: '40px 16px', color: '#71717a' }}
                >
                  <div className="flex flex-col items-center justify-center gap-3">
                    <BusinessIllustration type="empty-search" size="md" />
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-[#141414]">
                        لا توجد نتائج مطابقة لخيارات البحث أو التصفية
                      </div>
                      <div className="text-xs text-[#707070]">
                        يمكنك تعديل كلمات البحث أو استخدام مستخرج المستندات الذكي لإضافة سجلات جديدة
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#f3f3f3] text-[#141414] border border-[#e0e0e0] hover:bg-[#f3f3f3] transition-colors cursor-pointer"
                        >
                          إعادة ضبط البحث
                        </button>
                      )}
                      {onAddClick && (
                        <button
                          type="button"
                          onClick={onAddClick}
                          className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#f3f3f3] text-[#141414] hover:bg-[#141414] transition-colors cursor-pointer"
                        >
                          + {addLabel}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          window.dispatchEvent(new CustomEvent('open-universal-extractor'))
                        }
                        className="px-4 py-1.5 rounded-full text-xs font-bold bg-white text-[#141414] border border-zinc-300 hover:bg-zinc-50 transition-colors cursor-pointer"
                      >
                        استخلاص من ملف (OCR)
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((row) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: '1px solid #e4e4e7',
                    backgroundColor: selectedIds.has(row.id) ? '#f3f3f3' : '#ffffff',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!selectedIds.has(row.id)) e.currentTarget.style.backgroundColor = '#f4f4f5';
                  }}
                  onMouseLeave={(e) => {
                    if (!selectedIds.has(row.id)) e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                >
                  <td style={{ textAlign: 'center', padding: cellPadding }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleSelectRow(row.id)}
                      style={{ cursor: 'pointer', accentColor: '#141414' }}
                    />
                  </td>
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      style={{
                        padding: cellPadding,
                        fontSize: cellFontSize,
                        fontWeight: 420,
                        color: '#141414',
                      }}
                    >
                      {typeof col.accessor === 'function'
                        ? col.accessor(row)
                        : (row[col.accessor] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer Stats */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          background: '#fafafa',
          borderTop: '1px solid #e4e4e7',
          fontSize: '12.5px',
          color: '#71717a',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div>
          إجمالي العناصر المعروضة:{' '}
          <strong style={{ color: '#141414' }}>{filteredData.length}</strong> من أصل{' '}
          <strong style={{ color: '#141414' }}>{data.length}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {searchQuery && (
            <span className="pill-tag-mint" style={{ fontSize: '11px' }}>
              نتائج مصفاة
            </span>
          )}
          <span>مجموعة خالد السليم • ERP UX 3.0</span>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
