import { describe, it, expect } from 'vitest';
import type { DoseEvent, EffectEntry, WeightEntry } from '../types';
import { buildPeriodReport, periodFor, shiftPeriod } from './reports';

const day = (m: number, d: number, h = 12) => new Date(2026, m - 1, d, h).toISOString();
const w = (id: string, iso: string, lbs: number): WeightEntry => ({ id, date: iso, weightLbs: lbs });
const dose = (id: string, iso: string, mg: number): DoseEvent => ({ id, date: iso, amountMg: mg, medication: 'Tirzepatide', site: 'Thigh: Left', painLevel: 0, notes: '' });
const eff = (id: string, iso: string, over: Partial<EffectEntry> = {}): EffectEntry => ({
  id, date: iso, hunger: 'none', foodNoise: 'none', cravings: 'none', mood: 'none', energy: 'none', nausea: 'none', fatigue: 'none',
  constipation: 'none', diarrhea: 'none', reflux: 'none', appetiteLoss: 'none', bloating: 'none', dehydration: 'none', indigestion: 'none', insomnia: 'none', notes: '', ...over,
});

describe('periodFor / shiftPeriod', () => {
  it('weekly periods run Monday to Sunday', () => {
    const r = periodFor('weekly', new Date(2026, 5, 17, 9)); // Wed 17 Jun 2026
    expect([r.start.getDay(), r.start.getDate(), r.end.getDay(), r.end.getDate()]).toEqual([1, 15, 0, 21]);
  });
  it('monthly periods cover the calendar month, including leap-year February', () => {
    const r = periodFor('monthly', new Date(2028, 1, 10));
    expect([r.start.getDate(), r.end.getDate(), r.end.getMonth()]).toEqual([1, 29, 1]);
  });
  it('shifts back and forward across month and year boundaries', () => {
    const jan = periodFor('monthly', new Date(2026, 0, 15));
    const dec = shiftPeriod(jan, -1);
    expect([dec.start.getFullYear(), dec.start.getMonth()]).toEqual([2025, 11]);
    expect(shiftPeriod(dec, 1).start.getTime()).toBe(jan.start.getTime());
    const wk = periodFor('weekly', new Date(2026, 5, 17));
    expect(shiftPeriod(wk, -1).start.getDate()).toBe(8);
  });
});

describe('buildPeriodReport', () => {
  const range = periodFor('weekly', new Date(2026, 5, 17));
  const args = {
    weights: [w('a', day(6, 8), 200), w('b', day(6, 15), 199), w('c', day(6, 21), 197), w('d', day(6, 22), 190)],
    doses: [dose('x', day(6, 9), 2.5), dose('y', day(6, 16), 5)],
    effects: [eff('e1', day(6, 16), { nausea: 'moderate' }), eff('e2', day(6, 12), { fatigue: 'severe' })],
    range,
  };
  it('includes only entries inside the period and computes real changes', () => {
    const r = buildPeriodReport(args);
    expect(r.weights.entries.map((x) => x.id)).toEqual(['b', 'c']);
    expect(r.weights.changeLbs).toBeCloseTo(-2);
    expect(r.weights.averageLbs).toBeCloseTo(198);
    expect(r.doses.entries.map((x) => x.id)).toEqual(['y']);
    expect(r.symptoms.daysLogged).toBe(1);
    expect(r.symptoms.items.map((i) => i.label)).toEqual(['Nausea']);
  });
  it('reports a dose change versus the dose just before the period', () => {
    expect(buildPeriodReport(args).doses.changedFrom).toEqual({ amountMg: 2.5, medication: 'Tirzepatide' });
    const same = buildPeriodReport({ ...args, doses: [dose('x', day(6, 9), 5), dose('y', day(6, 16), 5)] });
    expect(same.doses.changedFrom).toBeNull();
  });
  it('has no change with a single weigh-in and flags an empty period', () => {
    const one = buildPeriodReport({ ...args, weights: [w('b', day(6, 15), 199)] });
    expect(one.weights.changeLbs).toBeNull();
    const empty = buildPeriodReport({ weights: [], doses: [], effects: [], range });
    expect(empty.isEmpty).toBe(true);
    expect(empty.weights.averageLbs).toBeNull();
  });
});
