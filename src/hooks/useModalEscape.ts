import { useEffect } from 'react';

/** Attribute placed on every modal backdrop so the topmost one can be closed with `Escape`. */
export const MODAL_OVERLAY_ATTR = 'data-erp-modal-overlay';

/**
 * Closes the topmost open modal (any element marked with `data-erp-modal-overlay`)
 * when the user presses `Escape`. The overlay's own backdrop `onClick` performs the
 * actual state change, so the page keeps full control over its modal state.
 */
export function useModalEscape(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const overlays = document.querySelectorAll<HTMLElement>(`[${MODAL_OVERLAY_ATTR}]`);
      const top = overlays[overlays.length - 1];
      if (top) {
        event.stopPropagation();
        top.click();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
