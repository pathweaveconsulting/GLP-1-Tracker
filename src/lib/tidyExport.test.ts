import { describe, it, expect } from 'vitest';
import type { DoseEvent, EffectEntry, WeightEntry } from '../types';
import { buildTidyCsv, buildTidyRows, TIDY_HEADER } from './tidyExport';
import { parseCsv } from './csv';

const at = (m: number, d: number, h = 12, min = 0) => new Date(2026, m - 1, d, h, min).toISOString();
const weights: WeightEntry[] = [{ id: 'w1', date: at(3, 5), weightLbs: 220.462 }];
const doses: DoseEvent[] = [{ id: 'd1', date: at(3, 5, 21, 30), medication: 'Tirzepatide', amountMg: 5, site: 'Thigh: Left', painLevel: 2, notes: '=cmd|calc' }];
const effects: EffectEntry[] = [
  { id: 'e1', date: at(3, 6), hunger: 'none', foodNoise: 'none', cravings: 'none', mood: 'none', energy: 'none', nausea: 'moderate', fatigue: 'none', constipation: 'none', diarrhea: 'none', reflux: 'none', appetiteLoss: 'none', bloating: 'none', dehydration: 'none', indigestion: 'none', insomnia: 'none', customEffects: { Headache: 'mild' }, notes: 'rough, day' },
  { id: 'e2', date: at(3, 7), hunger: 'none', foodNoise: 'none', cravings: 'none', mood: 'none', energy: 'none', nausea: 'none', fatigue: 'none', constipation: 'none', diarrhea: 'none', reflux: 'none', appetiteLoss: 'none', bloating: 'none', dehydration: 'none', indigestion: 'none', insomnia: 'none', notes: '' },
];

describe('tidy export', () => {
  it('uses the agreed header and the user’s unit for weights', () => {
    expect([...TIDY_HEADER]).toEqual(['Type', 'Date', 'Item', 'Value', 'Unit', 'Details', 'Notes']);
    const kg = buildTidyRows({ doses: [], weights, effects: [], unit: 'kg' });
    expect(kg).toEqual([['Weight', '2026-03-05', 'Weight', 100, 'kg', '', '']]);
    const lb = buildTidyRows({ doses: [], weights, effects: [], unit: 'lbs' });
    expect(lb[0].slice(3, 5)).toEqual([220.5, 'lbs']);
  });
  it('writes local dates, dose time and a row per logged symptom, sorted by date', () => {
    const rows = buildTidyRows({ doses, weights, effects, unit: 'lbs' });
    expect(rows.map((r) => [r[0], r[1], r[2]])).toEqual([
      ['Weight', '2026-03-05', 'Weight'],
      ['Dose', '2026-03-05', 'Tirzepatide'],
      ['Symptom', '2026-03-06', 'Nausea'],
      ['Symptom', '2026-03-06', 'Headache'],
      ['Symptom', '2026-03-07', 'No symptoms'],
    ]);
    expect(rows[1][5]).toBe('Site: Thigh: Left; Time: 21:30; Discomfort: 2/10');
    expect(rows[2][6]).toBe('rough, day'); // note only on the first symptom row of that day
    expect(rows[3][6]).toBe('');
  });
  it('neutralises formulas from user notes and parses back cleanly', () => {
    const csv = buildTidyCsv({ doses, weights, effects, unit: 'lbs' });
    const parsed = parseCsv(csv);
    expect(parsed[0]).toEqual([...TIDY_HEADER]);
    const doseRow = parsed.find((r) => r[0] === 'Dose')!;
    expect(doseRow[6]).toBe("'=cmd|calc");
    expect(parsed.every((r) => r.length === 7)).toBe(true);
  });
});
