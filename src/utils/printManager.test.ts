import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyModalPrintIsolation,
  clearModalPrintIsolation,
  resolveActivePrintTarget,
} from './printManager';

describe('Enterprise Modal & Sheet Print Isolator (printManager)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    clearModalPrintIsolation(document);
  });

  it('returns null when only normal workspace content is rendered', () => {
    document.body.innerHTML = `
      <div id="root">
        <aside>Sidebar</aside>
        <main><h1>لوحة القيادة التنفيذية</h1></main>
      </div>
    `;
    expect(resolveActivePrintTarget(document)).toBeNull();
    expect(applyModalPrintIsolation(document)).toBeNull();
    expect(document.body.hasAttribute('data-erp-printing-modal')).toBe(false);
  });

  it('isolates the topmost z-index printable sheet when modals are stacked (e.g. HR Letters Studio over 360° Drawer)', () => {
    document.body.innerHTML = `
      <div id="root">
        <main>Background Dashboard</main>
        <div id="drawer-360" data-printable-modal="true" style="position: fixed; z-index: 10000;">
          <div class="erp-printable-sheet" id="sheet-360">ملف الموظف الشامل 360</div>
        </div>
      </div>
      <div id="letters-portal" data-printable-modal="true" style="position: fixed; z-index: 11000;">
        <div class="no-print print:hidden">Top Studio Bar</div>
        <div id="studio-grid">
          <div class="no-print print:hidden">Sidebar Controls</div>
          <div id="preview-pane">
            <div class="erp-printable-sheet" id="sheet-letter">خطاب تعريف بالراتب الموثق بـ QR</div>
          </div>
        </div>
      </div>
    `;

    const isolated = applyModalPrintIsolation(document);
    expect(isolated?.id).toBe('sheet-letter');
    expect(document.body.getAttribute('data-erp-printing-modal')).toBe('true');
    expect(isolated?.getAttribute('data-active-print-root')).toBe('true');

    // Ancestors of sheet-letter are marked, while #root and #drawer-360 are NOT marked!
    expect(document.getElementById('preview-pane')?.getAttribute('data-active-print-ancestor')).toBe('true');
    expect(document.getElementById('studio-grid')?.getAttribute('data-active-print-ancestor')).toBe('true');
    expect(document.getElementById('letters-portal')?.getAttribute('data-active-print-ancestor')).toBe('true');
    expect(document.getElementById('root')?.hasAttribute('data-active-print-ancestor')).toBe(false);
    expect(document.getElementById('drawer-360')?.hasAttribute('data-active-print-root')).toBe(false);

    clearModalPrintIsolation(document);
    expect(document.body.hasAttribute('data-erp-printing-modal')).toBe(false);
    expect(isolated?.hasAttribute('data-active-print-root')).toBe(false);
    expect(document.getElementById('letters-portal')?.hasAttribute('data-active-print-ancestor')).toBe(false);
  });

  it('ignores non-printable dialogs marked with print:hidden (such as ExportPreviewModal)', () => {
    document.body.innerHTML = `
      <div id="root">
        <main>Workspace Table</main>
      </div>
      <div role="dialog" class="fixed inset-0 print:hidden" style="z-index: 100200;">
        <div>Export Preview Studio UI</div>
      </div>
    `;

    expect(resolveActivePrintTarget(document)).toBeNull();
  });
});
