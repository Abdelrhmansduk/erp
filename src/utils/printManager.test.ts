import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyModalPrintIsolation,
  BODY_PRINT_ORIENTATION_ATTR,
  clearModalPrintIsolation,
  PRINT_STAGE_ID,
  resolveActivePrintTarget,
  WORKSPACE_A4_STYLE_ID,
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

  it('injects an authoritative A4 portrait @page lock and 272mm sheet geometry inside #erp-print-stage for full-page certificates', () => {
    document.body.innerHTML = `
      <div id="legal-modal" data-printable-modal="true" style="position: fixed; z-index: 2200;">
        <div class="erp-printable-sheet erp-a4-sheet m-4 rounded-2xl" data-a4-fullpage="true" id="legal-cert">
          شهادة إقرار وتعهد قانوني
        </div>
      </div>
    `;

    const isolated = applyModalPrintIsolation(document);
    expect(isolated?.id).toBe('legal-cert');

    const stage = document.getElementById(PRINT_STAGE_ID);
    expect(stage).not.toBeNull();
    expect(document.body.getAttribute(BODY_PRINT_ORIENTATION_ATTR)).toBe('portrait');

    const a4Lock = stage?.querySelector<HTMLStyleElement>('style[data-erp-a4-lock="true"]');
    expect(a4Lock?.textContent).toContain('@page');
    expect(a4Lock?.textContent).toContain('size: A4 portrait');

    const clonedSheet = stage?.querySelector<HTMLElement>('#legal-cert');
    expect(clonedSheet?.style.maxWidth).toBe('210mm');
    expect(clonedSheet?.style.minHeight).toBe('272mm');
    expect(clonedSheet?.style.margin).toBe('0px auto');
  });

  it('supports A4 landscape orientation when explicitly marked on a printable target', () => {
    document.body.innerHTML = `
      <div id="wide-modal" data-printable-modal="true" data-print-orientation="landscape" style="position: fixed; z-index: 2200;">
        <div class="erp-printable-sheet" id="wide-boq">جدول الكميات العريض</div>
      </div>
    `;

    applyModalPrintIsolation(document);
    const stage = document.getElementById(PRINT_STAGE_ID);
    const a4Lock = stage?.querySelector<HTMLStyleElement>('style[data-erp-a4-lock="true"]');

    expect(document.body.getAttribute(BODY_PRINT_ORIENTATION_ATTR)).toBe('landscape');
    expect(a4Lock?.textContent).toContain('size: A4 landscape');
    const clonedSheet = stage?.querySelector<HTMLElement>('#wide-boq');
    expect(clonedSheet?.style.maxWidth).toBe('297mm');
  });

  it('locks direct workspace Ctrl+P prints to A4 portrait and cleans up on clearModalPrintIsolation', () => {
    document.body.innerHTML = `
      <div id="root">
        <main><h1>تقرير مباشر</h1></main>
      </div>
    `;

    const isolated = applyModalPrintIsolation(document);
    expect(isolated).toBeNull();

    const workspaceLock = document.getElementById(WORKSPACE_A4_STYLE_ID);
    expect(workspaceLock?.textContent).toContain('size: A4 portrait');
    expect(document.body.getAttribute(BODY_PRINT_ORIENTATION_ATTR)).toBe('portrait');

    clearModalPrintIsolation(document);
    expect(document.getElementById(WORKSPACE_A4_STYLE_ID)).toBeNull();
    expect(document.body.hasAttribute(BODY_PRINT_ORIENTATION_ATTR)).toBe(false);
  });
});
