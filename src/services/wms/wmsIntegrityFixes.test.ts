import { describe, it, expect, beforeEach } from 'vitest';
import { wmsEngineService, WmsActor } from './wmsEngineService';

const ACTOR: WmsActor = { email: 'qa.wms@kas.sa', name: 'مراجع جودة المستودع' };

describe('WMS integrity fixes — per-company Undo isolation & audit actor', () => {
  beforeEach(() => {
    wmsEngineService.resetToSeedForTesting('SAF');
    wmsEngineService.resetToSeedForTesting('KAS');
  });

  it('keeps Undo history isolated per company (undo in SAF never restores a KAS snapshot)', () => {
    const kasItem = wmsEngineService.getState('KAS').items[0];
    const originalName = kasItem.nameAr;
    wmsEngineService.updateItem(kasItem.id, { nameAr: `${originalName} - معدّل` }, ACTOR);
    expect(wmsEngineService.getUndoRedoCounts().undoCount).toBe(1);

    // Switch to SAF: its history must be empty and undo must be a no-op
    wmsEngineService.setActiveCompany('SAF');
    expect(wmsEngineService.getUndoRedoCounts().undoCount).toBe(0);
    expect(wmsEngineService.undo(ACTOR)).toBe(false);
    expect(wmsEngineService.getState('SAF').items.some((i) => i.id === kasItem.id)).toBe(false);

    // Back to KAS: undo restores the original item name only in KAS
    wmsEngineService.setActiveCompany('KAS');
    expect(wmsEngineService.undo(ACTOR)).toBe(true);
    expect(wmsEngineService.getState('KAS').items.find((i) => i.id === kasItem.id)?.nameAr).toBe(originalName);
    expect(wmsEngineService.getUndoRedoCounts().redoCount).toBe(1);

    expect(wmsEngineService.redo(ACTOR)).toBe(true);
    expect(wmsEngineService.getState('KAS').items.find((i) => i.id === kasItem.id)?.nameAr).toBe(`${originalName} - معدّل`);
  });

  it('records the real actor in the audit log (no impersonated fallback identity)', () => {
    const item = wmsEngineService.getState('KAS').items[0];
    wmsEngineService.updateItem(item.id, { notes: 'فحص سجل التدقيق' }, { email: '', name: '' });
    const last = wmsEngineService.getState('KAS').auditLogs[0];
    expect(last.actorEmail).toBe('unknown@kas-erp.com');
    expect(last.actorEmail).not.toBe('h.salman.trade@kas.sa');
  });
});
