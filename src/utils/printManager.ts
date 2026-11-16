/**
 * Enterprise Modal & Document Print Isolator (`src/utils/printManager.ts`)
 *
 * Ensures that whenever `window.print()`, `printSpecificElement()`, or `Ctrl+P` is triggered:
 * 1. If a printable modal/sheet, Export Studio preview, or explicitly targeted inline card
 *    is active, it is cloned into a dedicated top-level `#erp-print-stage` portal directly
 *    under `document.body` (hidden on screen, sole visible subtree during `@media print`).
 * 2. Eliminates background dashboard bleed, `marginRight: 280px` sidebar offset,
 *    stacked-modal collisions, `max-h-[90vh]` / `overflow-y-auto` clipping, and premature
 *    `setTimeout(1500)` resets while Chromium's Print Preview dialog is still open.
 * 3. If no modal is active, cleans any print stage so `@media print` workspace rules
 *    print the active page at full 100% A4 width without floating widgets or chrome.
 */

export const PRINT_STAGE_ID = 'erp-print-stage';
export const BODY_STAGE_PRINT_ATTR = 'data-erp-stage-printing';
export const ACTIVE_ROOT_ATTR = 'data-active-print-root';
export const ACTIVE_ANCESTOR_ATTR = 'data-active-print-ancestor';
export const BODY_MODAL_PRINT_ATTR = 'data-erp-printing-modal';
export const BODY_PRINT_ORIENTATION_ATTR = 'data-erp-print-orientation';
export const WORKSPACE_A4_STYLE_ID = 'erp-workspace-a4-lock';

const EXCLUDED_CHROME_SELECTOR =
  '[data-ai-copilot="true"], [data-notification-toaster="true"], [data-slot="sidebar"], [data-slot="topbar"], [data-slot="mobile-bottom-nav"], aside, nav';

const PRINT_HIDDEN_DESCENDANT_SELECTOR =
  '.no-print, .print\\:hidden, [data-no-print="true"], [aria-hidden="true"], .toolbar';

let explicitPrintTarget: HTMLElement | null = null;
let lastPrintTimestamp = 0;

interface ErpPrintWindowState {
  installed: boolean;
  nativePrint?: (() => void) & { _isMockFunction?: boolean };
  mediaQuery?: MediaQueryList;
  onBeforePrint: () => void;
  onAfterPrint: () => void;
  onMediaChange: (e: MediaQueryListEvent) => void;
  onUserInteractionCleanup: () => void;
}

declare global {
  interface Window {
    __erpPrintIsolatorInstalled?: boolean;
    __erpPrintState?: ErpPrintWindowState;
  }
}

function isElementExcludedFromPrint(el: Element): boolean {
  return Boolean(
    el.closest('.print\\:hidden, .no-print, [data-no-print="true"], [aria-hidden="true"]') ||
      el.closest(EXCLUDED_CHROME_SELECTOR)
  );
}

function isVisiblyRenderedBase(el: HTMLElement, win: Window): boolean {
  const style = win.getComputedStyle(el);
  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    parseFloat(style.opacity || '1') === 0
  ) {
    return false;
  }
  if (el.children.length === 0 && el.textContent?.trim() === '') {
    return false;
  }
  return true;
}

function isElementVisiblyRendered(el: HTMLElement, win: Window): boolean {
  if (isElementExcludedFromPrint(el)) return false;
  return isVisiblyRenderedBase(el, win);
}

function getEffectiveZIndex(el: HTMLElement, win: Window): number {
  let maxZ = 0;
  let curr: HTMLElement | null = el;
  while (curr && curr !== curr.ownerDocument.body) {
    const zRaw = win.getComputedStyle(curr).zIndex;
    const parsed = Number.parseInt(zRaw, 10);
    if (Number.isFinite(parsed) && parsed > maxZ) {
      maxZ = parsed;
    }
    curr = curr.parentElement;
  }
  return maxZ;
}

function resolveA4Orientation(
  target: HTMLElement | null,
  iframeCssCombined = ''
): 'portrait' | 'landscape' {
  if (
    target?.getAttribute('data-print-orientation') === 'landscape' ||
    target?.closest('[data-print-orientation="landscape"]') ||
    /@page[\s\S]*?size\s*:\s*(?:A4\s+)?landscape/i.test(iframeCssCombined)
  ) {
    return 'landscape';
  }
  return 'portrait';
}

function buildA4PageLockCss(
  orientation: 'portrait' | 'landscape',
  margin = '10mm 12mm'
): string {
  return `@page { size: A4 ${orientation}; margin: ${margin}; }`;
}

function scopeIframeCssForStage(cssText: string): string {
  if (!cssText) return '';
  // Normalize any @page size declarations inside embedded iframe CSS to ISO A4
  const normalizedPageCss = cssText.replace(
    /(@page\b[^}]*?\bsize\s*:\s*)(?:A4\s+)?(portrait|landscape)|(@page\b[^}]*?\bsize\s*:\s*)(?:letter|legal|a5|b5)(?:\s+(portrait|landscape))?/gi,
    (_match, p1?: string, dir1?: string, p3?: string, dir3?: string) => {
      if (p1) {
        return `${p1}A4 ${(dir1 || 'portrait').toLowerCase()}`;
      }
      return `${p3 || ''}A4 ${(dir3 || 'portrait').toLowerCase()}`;
    }
  );
  // Rewrite top-level html / body selectors to `#erp-print-stage .erp-iframe-print-body`
  // so embedded report rules never leak onto the host document while preserving @media / @page.
  return normalizedPageCss.replace(
    /(^|[},;\n])(\s*)(html\s*,\s*body|body|html)(?=\s*[{,:.[#])/gim,
    (_match, prefix: string, ws: string) => `${prefix}${ws}#erp-print-stage .erp-iframe-print-body`
  );
}

function syncClonedFormAndCanvasState(sourceRoot: HTMLElement, cloneRoot: HTMLElement): void {
  const srcInputs = sourceRoot.querySelectorAll('input');
  const dstInputs = cloneRoot.querySelectorAll('input');
  for (let i = 0; i < srcInputs.length && i < dstInputs.length; i++) {
    const src = srcInputs[i];
    const dst = dstInputs[i];
    dst.value = src.value;
    if (src.type === 'checkbox' || src.type === 'radio') {
      dst.checked = src.checked;
      if (src.checked) {
        dst.setAttribute('checked', 'checked');
      } else {
        dst.removeAttribute('checked');
      }
    } else {
      dst.setAttribute('value', src.value);
    }
  }

  const srcTextareas = sourceRoot.querySelectorAll('textarea');
  const dstTextareas = cloneRoot.querySelectorAll('textarea');
  for (let i = 0; i < srcTextareas.length && i < dstTextareas.length; i++) {
    const src = srcTextareas[i];
    const dst = dstTextareas[i];
    dst.value = src.value;
    dst.textContent = src.value;
  }

  const srcSelects = sourceRoot.querySelectorAll('select');
  const dstSelects = cloneRoot.querySelectorAll('select');
  for (let i = 0; i < srcSelects.length && i < dstSelects.length; i++) {
    const src = srcSelects[i];
    const dst = dstSelects[i];
    dst.selectedIndex = src.selectedIndex;
    for (let j = 0; j < src.options.length && j < dst.options.length; j++) {
      if (src.options[j].selected) {
        dst.options[j].setAttribute('selected', 'selected');
      } else {
        dst.options[j].removeAttribute('selected');
      }
    }
  }

  const srcCanvases = sourceRoot.querySelectorAll('canvas');
  const dstCanvases = cloneRoot.querySelectorAll('canvas');
  for (let i = 0; i < srcCanvases.length && i < dstCanvases.length; i++) {
    const srcCanvas = srcCanvases[i];
    const dstCanvas = dstCanvases[i];
    try {
      const dataUrl = srcCanvas.toDataURL('image/png');
      if (dataUrl && dataUrl !== 'data:,') {
        const img = cloneRoot.ownerDocument.createElement('img');
        img.src = dataUrl;
        img.alt = srcCanvas.getAttribute('aria-label') || 'canvas-print';
        img.className = dstCanvas.className;
        img.setAttribute('style', dstCanvas.getAttribute('style') || '');
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        dstCanvas.parentNode?.replaceChild(img, dstCanvas);
      }
    } catch {
      // Canvas tainted or unsupported in headless jsdom; keep fallback canvas node
    }
  }
}

function unclipCloneContainerStyles(
  el: HTMLElement,
  orientation: 'portrait' | 'landscape' = 'portrait'
): void {
  const isFullPageSheet =
    el.classList.contains('erp-a4-sheet') || el.getAttribute('data-a4-fullpage') === 'true';

  el.style.position = 'static';
  el.style.inset = 'auto';
  el.style.width = '100%';
  el.style.maxWidth = orientation === 'landscape' ? '297mm' : '210mm';
  el.style.height = 'auto';
  el.style.maxHeight = 'none';
  el.style.minHeight = isFullPageSheet ? '272mm' : '0';
  el.style.overflow = 'visible';
  el.style.transform = 'none';
  el.style.animation = 'none';
  el.style.boxShadow = 'none';
  el.style.margin = '0 auto';
  el.style.borderRadius = '0';

  const nestedSheets = el.querySelectorAll<HTMLElement>(
    '.erp-printable-sheet, .erp-a4-sheet, [data-a4-fullpage="true"]'
  );
  nestedSheets.forEach((sheet) => {
    sheet.style.margin = '0 auto';
    sheet.style.borderRadius = '0';
    sheet.style.maxWidth = orientation === 'landscape' ? '297mm' : '210mm';
    sheet.style.maxHeight = 'none';
    sheet.style.overflow = 'visible';
    if (
      sheet.classList.contains('erp-a4-sheet') ||
      sheet.getAttribute('data-a4-fullpage') === 'true'
    ) {
      sheet.style.minHeight = '272mm';
    }
  });

  const scrollables = el.querySelectorAll<HTMLElement>(
    '[class*="max-h-"], [class*="overflow-y-auto"], [class*="overflow-x-auto"], [class*="overflow-auto"], [class*="h-full"], [class*="h-screen"]'
  );
  scrollables.forEach((node) => {
    node.style.maxHeight = 'none';
    node.style.height = 'auto';
    node.style.overflow = 'visible';
    node.style.maxWidth = '100%';
  });
}

function stageTargetIntoPrintPortal(target: HTMLElement, doc: Document): HTMLElement {
  const existingStage = doc.getElementById(PRINT_STAGE_ID);
  if (existingStage) {
    existingStage.remove();
  }

  const stage = doc.createElement('div');
  stage.id = PRINT_STAGE_ID;
  const resolvedDir =
    target.getAttribute('dir') ||
    target.closest('[dir]')?.getAttribute('dir') ||
    doc.documentElement.getAttribute('dir') ||
    'rtl';
  stage.setAttribute('dir', resolvedDir);

  let combinedIframeCss = '';
  const isExportIframe = target.getAttribute('data-export-preview-modal') === 'true';

  if (isExportIframe) {
    const iframe = target.querySelector<HTMLIFrameElement>('iframe');
    let iframeDoc: Document | null = null;
    try {
      if (iframe?.contentDocument?.body?.innerHTML?.trim()) {
        iframeDoc = iframe.contentDocument;
      }
    } catch {
      iframeDoc = null;
    }

    if (!iframeDoc && iframe) {
      const srcDoc = iframe.getAttribute('srcdoc') || '';
      if (srcDoc.trim()) {
        iframeDoc = new DOMParser().parseFromString(srcDoc, 'text/html');
      }
    }

    if (iframeDoc?.body) {
      const styleTags = iframeDoc.querySelectorAll('style');
      styleTags.forEach((styleNode) => {
        const rawCss = styleNode.textContent || '';
        combinedIframeCss += `\n${rawCss}`;
        const scopedStyle = doc.createElement('style');
        scopedStyle.textContent = scopeIframeCssForStage(rawCss);
        stage.appendChild(scopedStyle);
      });

      const bodyWrapper = doc.createElement('div');
      bodyWrapper.className = 'erp-iframe-print-body erp-printable-sheet';
      const iframeDir =
        iframeDoc.body.getAttribute('dir') ||
        iframeDoc.documentElement.getAttribute('dir') ||
        resolvedDir;
      bodyWrapper.setAttribute('dir', iframeDir);
      bodyWrapper.innerHTML = iframeDoc.body.innerHTML;
      bodyWrapper
        .querySelectorAll('.no-print, .print\\:hidden, [data-no-print="true"], .toolbar, script')
        .forEach((node) => node.remove());
      stage.appendChild(bodyWrapper);
    } else {
      const orientation = resolveA4Orientation(target, combinedIframeCss);
      const clone = target.cloneNode(true) as HTMLElement;
      clone.classList.remove('print:hidden');
      syncClonedFormAndCanvasState(target, clone);
      clone.querySelectorAll(PRINT_HIDDEN_DESCENDANT_SELECTOR).forEach((node) => node.remove());
      unclipCloneContainerStyles(clone, orientation);
      stage.appendChild(clone);
    }
  } else {
    const orientation = resolveA4Orientation(target);
    const clone = target.cloneNode(true) as HTMLElement;
    clone.classList.remove('print:hidden', 'no-print');
    syncClonedFormAndCanvasState(target, clone);
    clone.querySelectorAll(PRINT_HIDDEN_DESCENDANT_SELECTOR).forEach((node) => node.remove());
    unclipCloneContainerStyles(clone, orientation);
    stage.appendChild(clone);
  }

  const orientation = resolveA4Orientation(target, combinedIframeCss);
  const a4LockStyle = doc.createElement('style');
  a4LockStyle.setAttribute('data-erp-a4-lock', 'true');
  a4LockStyle.textContent = buildA4PageLockCss(
    orientation,
    isExportIframe ? '8mm 10mm' : '10mm 12mm'
  );
  stage.appendChild(a4LockStyle);
  doc.body?.setAttribute(BODY_PRINT_ORIENTATION_ATTR, orientation);

  doc.body.appendChild(stage);
  return stage;
}

/**
 * Resolves the exact topmost printable root element if a modal, Export Studio preview,
 * or explicitly targeted inline card is active.
 */
export function resolveActivePrintTarget(doc: Document = document): HTMLElement | null {
  const win = doc.defaultView;
  if (!win || !doc.body) return null;

  if (explicitPrintTarget && explicitPrintTarget.isConnected && doc.contains(explicitPrintTarget)) {
    return explicitPrintTarget;
  }

  // ExportPreviewModal carries `print:hidden` on its shell so Ctrl+P doesn't print its toolbar;
  // detect it explicitly before general `.print:hidden` filtering so its live A4 preview prints cleanly.
  const exportPreviewModal = Array.from(
    doc.querySelectorAll<HTMLElement>('[data-export-preview-modal="true"]')
  ).find((el) => isVisiblyRenderedBase(el, win));

  const rawCandidates = Array.from(
    doc.querySelectorAll<HTMLElement>(
      '[data-printable-modal="true"], [role="dialog"], [data-erp-modal-overlay="true"], .fixed.inset-0'
    )
  ).filter((el) => isElementVisiblyRendered(el, win));

  if (exportPreviewModal && !rawCandidates.includes(exportPreviewModal)) {
    rawCandidates.push(exportPreviewModal);
  }

  if (rawCandidates.length === 0) {
    return null;
  }

  let best = rawCandidates[0];
  let bestZ = getEffectiveZIndex(best, win);

  for (let i = 1; i < rawCandidates.length; i++) {
    const candidate = rawCandidates[i];
    const candidateZ = getEffectiveZIndex(candidate, win);

    if (best.contains(candidate)) {
      if (
        candidate.getAttribute('data-printable-modal') === 'true' ||
        candidate.classList.contains('erp-printable-sheet')
      ) {
        best = candidate;
        bestZ = Math.max(bestZ, candidateZ);
      }
      continue;
    }

    if (candidate.contains(best)) {
      bestZ = Math.max(bestZ, candidateZ);
      continue;
    }

    if (candidateZ > bestZ) {
      best = candidate;
      bestZ = candidateZ;
    } else if (candidateZ === bestZ) {
      const pos = best.compareDocumentPosition(candidate);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) {
        best = candidate;
      }
    }
  }

  if (best.getAttribute('data-export-preview-modal') === 'true') {
    return best;
  }

  // Refine `best` to its inner `.erp-printable-sheet` when exactly one visible sheet exists inside
  if (!best.classList.contains('erp-printable-sheet')) {
    const innerSheets = Array.from(
      best.querySelectorAll<HTMLElement>('.erp-printable-sheet')
    ).filter((sheet) => isElementVisiblyRendered(sheet, win));

    if (innerSheets.length === 1) {
      return innerSheets[0];
    }

    if (
      best.classList.contains('fixed') &&
      best.classList.contains('inset-0') &&
      best.children.length === 1 &&
      best.firstElementChild instanceof HTMLElement
    ) {
      return best.firstElementChild;
    }
  }

  return best;
}

function clearStageDomOnly(doc: Document = document): void {
  const existingStage = doc.getElementById(PRINT_STAGE_ID);
  if (existingStage) {
    existingStage.remove();
  }
  const workspaceA4Style = doc.getElementById(WORKSPACE_A4_STYLE_ID);
  if (workspaceA4Style) {
    workspaceA4Style.remove();
  }
  if (!doc.body) return;
  doc.body.removeAttribute(BODY_STAGE_PRINT_ATTR);
  doc.body.removeAttribute(BODY_MODAL_PRINT_ATTR);
  doc.body.removeAttribute(BODY_PRINT_ORIENTATION_ATTR);
  doc
    .querySelectorAll(`[${ACTIVE_ROOT_ATTR}]`)
    .forEach((el) => el.removeAttribute(ACTIVE_ROOT_ATTR));
  doc
    .querySelectorAll(`[${ACTIVE_ANCESTOR_ATTR}]`)
    .forEach((el) => el.removeAttribute(ACTIVE_ANCESTOR_ATTR));
}

/**
 * Stages the resolved printable modal/sheet/card into `#erp-print-stage` directly under
 * `document.body` and marks ancestor attributes right before printing.
 */
export function applyModalPrintIsolation(doc: Document = document): HTMLElement | null {
  clearStageDomOnly(doc);
  lastPrintTimestamp = Date.now();
  const target = resolveActivePrintTarget(doc);
  if (!doc.body) return null;

  if (!target) {
    const workspaceA4Style = doc.createElement('style');
    workspaceA4Style.id = WORKSPACE_A4_STYLE_ID;
    workspaceA4Style.setAttribute('data-erp-a4-lock', 'true');
    workspaceA4Style.textContent = buildA4PageLockCss('portrait', '10mm 12mm');
    (doc.head || doc.body).appendChild(workspaceA4Style);
    doc.body.setAttribute(BODY_PRINT_ORIENTATION_ATTR, 'portrait');
    return null;
  }

  target.setAttribute(ACTIVE_ROOT_ATTR, 'true');
  let ancestor = target.parentElement;
  while (ancestor && ancestor !== doc.body && ancestor !== doc.documentElement) {
    ancestor.setAttribute(ACTIVE_ANCESTOR_ATTR, 'true');
    ancestor = ancestor.parentElement;
  }
  doc.body.setAttribute(BODY_MODAL_PRINT_ATTR, 'true');

  stageTargetIntoPrintPortal(target, doc);
  doc.body.setAttribute(BODY_STAGE_PRINT_ATTR, 'true');
  return target;
}

/**
 * Removes `#erp-print-stage`, print isolation attributes, and any explicit card target
 * after printing completes.
 */
export function clearModalPrintIsolation(doc: Document = document): void {
  explicitPrintTarget = null;
  clearStageDomOnly(doc);
}

/**
 * Isolates a specific inline printable card or DOM element (such as an employee barcode card
 * or DualBrandingDocumentGenerator block) into `#erp-print-stage` and prints only that card.
 */
export function printSpecificElement(
  element: HTMLElement | null,
  docOrOptions: Document | { orientation?: 'portrait' | 'landscape'; doc?: Document } = document
): void {
  if (!element) {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
    return;
  }

  let doc: Document = document;
  if (docOrOptions && 'nodeType' in docOrOptions) {
    doc = docOrOptions;
  } else if (docOrOptions && typeof docOrOptions === 'object') {
    if (docOrOptions.orientation) {
      element.setAttribute('data-print-orientation', docOrOptions.orientation);
    }
    if (docOrOptions.doc) {
      doc = docOrOptions.doc;
    }
  }

  explicitPrintTarget = element;
  applyModalPrintIsolation(doc);

  if (typeof window !== 'undefined' && typeof window.print === 'function') {
    window.print();
  }
}

/**
 * Prints an arbitrary HTML fragment in an isolated A4 Landscape window / hidden iframe fallback.
 */
export function printArbitraryHtml(htmlContent: string, docTitle = 'مصنف_كاس_طبق_الأصل'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const fullDoc = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>${docTitle}</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    body { margin: 0; padding: 12px; font-family: Arial, 'Tajawal', sans-serif; direction: rtl; background: #fff; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
    tr { page-break-inside: avoid; break-inside: avoid; }
  </style>
</head>
<body>${htmlContent}</body>
</html>`;
  const w = window.open('', '_blank', 'width=1200,height=850');
  if (w && w.document) {
    w.document.open();
    w.document.write(fullDoc);
    w.document.close();
    setTimeout(() => {
      try {
        w.focus();
        w.print();
      } catch {
        // ignore
      }
    }, 200);
    return;
  }
  const container = document.createElement('div');
  container.setAttribute('data-print-orientation', 'landscape');
  container.innerHTML = htmlContent;
  document.body.appendChild(container);
  try {
    printSpecificElement(container, document);
  } finally {
    setTimeout(() => {
      if (document.body.contains(container)) document.body.removeChild(container);
    }, 2000);
  }
}

/**
 * Installs global `beforeprint` / `afterprint` / `matchMedia('print')` listeners and wraps
 * `window.print` (idempotently & HMR-safely) so all modal, card, and workspace prints
 * produce clean A4 output without premature timer resets.
 */
export function initGlobalPrintIsolator(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const existingState = window.__erpPrintState;
  const onBeforePrint = () => {
    applyModalPrintIsolation(document);
  };
  const onAfterPrint = () => {
    clearModalPrintIsolation(document);
  };
  const onMediaChange = (e: MediaQueryListEvent) => {
    if (!e.matches) {
      clearModalPrintIsolation(document);
    }
  };
  const onUserInteractionCleanup = () => {
    const isCurrentlyPrinting =
      typeof window.matchMedia === 'function' && window.matchMedia('print').matches;
    if (
      !isCurrentlyPrinting &&
      document.body?.hasAttribute(BODY_STAGE_PRINT_ATTR) &&
      Date.now() - lastPrintTimestamp > 800
    ) {
      clearModalPrintIsolation(document);
    }
  };

  if (existingState?.installed) {
    // HMR-safe: refresh delegate closures without duplicating listeners or double-wrapping window.print
    existingState.onBeforePrint = onBeforePrint;
    existingState.onAfterPrint = onAfterPrint;
    existingState.onMediaChange = onMediaChange;
    existingState.onUserInteractionCleanup = onUserInteractionCleanup;
    return;
  }

  const state: ErpPrintWindowState = {
    installed: true,
    onBeforePrint,
    onAfterPrint,
    onMediaChange,
    onUserInteractionCleanup,
  };
  window.__erpPrintState = state;
  window.__erpPrintIsolatorInstalled = true;

  window.addEventListener('beforeprint', () => state.onBeforePrint());
  window.addEventListener('afterprint', () => state.onAfterPrint());
  window.addEventListener('pointerdown', () => state.onUserInteractionCleanup(), {
    capture: true,
    passive: true,
  });
  window.addEventListener('keydown', () => state.onUserInteractionCleanup(), {
    capture: true,
    passive: true,
  });

  if (typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('print');
    state.mediaQuery = mq;
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', (e) => state.onMediaChange(e));
    }
  }

  const nativePrint = window.print as typeof window.print & { _isMockFunction?: boolean };
  if (typeof nativePrint === 'function' && !nativePrint._isMockFunction) {
    state.nativePrint = nativePrint;
    window.print = function erpIsolatedPrint(): void {
      lastPrintTimestamp = Date.now();
      applyModalPrintIsolation(document);
      nativePrint.call(window);
    };
  }
}

// Refresh active window handlers immediately during Vite HMR in local development
if (typeof window !== 'undefined' && window.__erpPrintState?.installed) {
  initGlobalPrintIsolator();
}
