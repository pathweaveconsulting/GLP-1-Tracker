import { describe, it, expect } from 'vitest';
import { BACKUP_FORMAT, BACKUP_VERSION, createBackup, parseBackup } from './backup';

const settings = { medication: 'Tirzepatide' as const, startingWeight: 220, targetWeight: 170, heightInches: 68, startDate: '2026-01-05T12:00:00.000Z', weightUnit: 'kg' as const };
const data = {
  settings,
  doses: [{ id: 'd1', medication: 'Tirzepatide' as const, amountMg: 5, date: '2026-02-01T12:00:00.000Z', site: 'Thigh: Left', painLevel: 1, notes: 'ok' }],
  weights: [{ id: 'w1', weightLbs: 210, date: '2026-02-01T12:00:00.000Z' }],
  effects: [{ id: 'e1', date: '2026-02-02T12:00:00.000Z', hunger: 'mild', foodNoise: 'none', cravings: 'none', mood: 'none', energy: 'none', nausea: 'none', fatigue: 'none', constipation: 'none', diarrhea: 'none', reflux: 'none', appetiteLoss: 'none', bloating: 'none', dehydration: 'none', indigestion: 'none', insomnia: 'none', notes: '' }],
} as const;
const file = (over: Record<string, unknown> = {}) => JSON.stringify({ ...createBackup(structuredClone(data) as never), ...over });

describe('parseBackup', () => {
  it('round-trips a valid backup', () => {
    const r = parseBackup(file());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.counts).toEqual({ doses: 1, weights: 1, effects: 1 });
      expect(r.data.settings.weightUnit).toBe('kg');
      expect(r.data.doses[0].medication).toBe('Tirzepatide');
    }
  });
  it('rejects non-JSON, wrong format tag, missing version and newer versions', () => {
    expect(parseBackup('{nope')).toMatchObject({ ok: false });
    expect(parseBackup(file({ format: 'something-else' }))).toMatchObject({ ok: false });
    expect(parseBackup(file({ version: undefined }))).toMatchObject({ ok: false });
    const newer = parseBackup(file({ version: BACKUP_VERSION + 1 }));
    expect(newer.ok).toBe(false);
    if (!newer.ok) expect(newer.errors[0]).toMatch(/newer version/);
    expect(BACKUP_FORMAT).toBe('glp1-tracker-backup');
  });
  it('reports readable per-row errors and rejects the whole file', () => {
    const bad = structuredClone(data) as any;
    bad.doses.push({ id: 'd2', amountMg: -3, date: 'banana', medication: 'Tirzepatide' });
    bad.weights.push({ id: 'w1', weightLbs: 'heavy', date: '2026-02-03T12:00:00.000Z' });
    const r = parseBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 1, data: bad }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors).toEqual(expect.arrayContaining([
        'Dose #2: “date” isn’t a valid date.',
        'Dose #2: “amountMg” must be a positive number.',
        'Weight #2: duplicate id “w1”.',
        'Weight #2: “weightLbs” must be a number between 0 and 1500.',
      ]));
    }
  });
  it('normalises brand names and loose severities', () => {
    const odd = structuredClone(data) as any;
    odd.doses[0].medication = 'Mounjaro';
    odd.effects[0].hunger = 'MODERATE';
    odd.effects[0].nausea = 'high';
    odd.effects[0].reflux = 'banana';
    odd.effects[0].customEffects = { Headache: 'Medium' };
    odd.settings.medication = 'Ozempic';
    const r = parseBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 1, data: odd }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.doses[0].medication).toBe('Tirzepatide');
      expect(r.data.settings.medication).toBe('Semaglutide');
      expect(r.data.effects[0]).toMatchObject({ hunger: 'moderate', nausea: 'severe', customEffects: { Headache: 'moderate' } });
      expect(r.data.effects[0]).not.toHaveProperty('reflux');
    }
  });
  it('rejects missing or invalid settings', () => {
    const noSettings = structuredClone(data) as any;
    delete noSettings.settings;
    expect(parseBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 1, data: noSettings })).ok).toBe(false);
    const badSettings = structuredClone(data) as any;
    badSettings.settings.startingWeight = 'x';
    expect(parseBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 1, data: badSettings })).ok).toBe(false);
  });
  it('caps the number of reported errors', () => {
    const many = structuredClone(data) as any;
    many.weights = Array.from({ length: 50 }, (_, i) => ({ id: `x${i}`, weightLbs: -1, date: 'bad' }));
    const r = parseBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 1, data: many }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeLessThanOrEqual(11);
  });
});
