import { describe, it, expect } from 'vitest';
import { checkDose } from './rowValidation';
import { parseBackup, createBackup } from './backup';
import { buildTidyRows } from './tidyExport';
import type { DoseEvent } from '../types';

const base = { id: 'd1', medication: 'Tirzepatide', amountMg: 5, date: '2026-02-01T12:00:00.000Z', site: 'Thigh: Left', notes: '' };

describe('3b: injection-site pain is optional ("not recorded"), never defaulted to 0', () => {
  it('a dose row without a pain level is valid and keeps pain as null', () => {
    for (const row of [{ ...base }, { ...base, painLevel: null }, { ...base, painLevel: undefined }]) {
      const r = checkDose(row);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.row.painLevel).toBeNull();
    }
  });
  it('a recorded 0 stays 0, other values are kept, and out-of-range or non-numeric values are still rejected', () => {
    for (const v of [0, 1, 7, 10]) { const r = checkDose({ ...base, painLevel: v }); expect(r.ok && r.row.painLevel).toBe(v); }
    for (const v of [-1, 11, 'x', NaN, Infinity, {}]) expect(checkDose({ ...base, painLevel: v }).ok).toBe(false);
  });

  it('backup: a missing/null pain restores as null, a number is unchanged, and a null survives export then restore', () => {
    const file = (doses: unknown[]) => JSON.stringify({ format: 'glp1-tracker-backup', version: 1, exportedAt: '2026-02-02T00:00:00.000Z', data: { settings: { medication: 'Tirzepatide', startingWeight: 200, targetWeight: 180, heightInches: 70, startDate: '2026-01-01T12:00:00.000Z', weightUnit: 'lbs' }, doses, weights: [], effects: [] } });
    const parsed = parseBackup(file([{ ...base }, { ...base, id: 'd2', painLevel: 3 }, { ...base, id: 'd3', painLevel: 0 }]));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.doses.map((d) => d.painLevel)).toEqual([null, 3, 0]);
    const again = parseBackup(JSON.stringify(createBackup(parsed.data)));
    expect(again.ok && again.data.doses.map((d) => d.painLevel)).toEqual([null, 3, 0]);
  });

  it('export says "not recorded" for null and keeps "Discomfort: N/10" for a number', () => {
    const dose = (painLevel: number | null): DoseEvent => ({ ...base, medication: 'Tirzepatide', painLevel } as DoseEvent);
    const rows = buildTidyRows({ weights: [], doses: [dose(null), { ...dose(2), id: 'd2' }, { ...dose(0), id: 'd3' }], effects: [], unit: 'lbs' } as never);
    const details = rows.map((r) => String(r[5]));
    expect(details[0]).toContain('Discomfort: not recorded');
    expect(details[0]).not.toMatch(/null|NaN|undefined|\/10/);
    expect(details.some((d) => d.includes('Discomfort: 2/10'))).toBe(true);
    expect(details.some((d) => d.includes('Discomfort: 0/10'))).toBe(true);
  });
});
