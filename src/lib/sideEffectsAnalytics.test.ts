import { describe, it, expect } from 'vitest';
import type { DoseEvent, EffectEntry } from '../types';
import { assignLogsToDoses, recoveryPattern, symptomOverview, symptomHeatmap, appetiteTrend, doseSymptomComparison, injectionDetail } from './sideEffectsAnalytics';

const at = (m: number, d: number) => new Date(2026, m - 1, d, 12).toISOString();
const dose = (id: string, iso: string, mg: number): DoseEvent => ({ id, date: iso, amountMg: mg, medication: 'Tirzepatide', site: 'x', painLevel: 0, notes: '' });
const eff = (id: string, iso: string, over: Partial<EffectEntry> = {}): EffectEntry => ({
  id, date: iso, hunger: 'none', foodNoise: 'none', cravings: 'none', mood: 'none', energy: 'none', nausea: 'none', fatigue: 'none',
  constipation: 'none', diarrhea: 'none', reflux: 'none', appetiteLoss: 'none', bloating: 'none', dehydration: 'none', indigestion: 'none', insomnia: 'none', notes: '', ...over,
});

const doses = [dose('d1', at(6, 1), 2.5), dose('d2', at(6, 8), 5)];

describe('assignLogsToDoses', () => {
  it('attaches each log to the most recent earlier dose within 6 days and drops the rest', () => {
    const logs = [eff('a', at(6, 2)), eff('b', at(6, 8)), eff('c', at(6, 12)), eff('d', at(5, 20)), eff('e', at(5, 30))];
    const a = assignLogsToDoses(logs, doses);
    expect(a.map((x) => [x.effect.id, x.dose.id, x.offset])).toEqual([['a', 'd1', 1], ['b', 'd2', 0], ['c', 'd2', 4]]);
  });
});

describe('recoveryPattern', () => {
  it('averages only logged days and leaves unlogged days null', () => {
    const r = recoveryPattern([eff('a', at(6, 2), { nausea: 'severe' }), eff('b', at(6, 9), { nausea: 'mild' })], doses);
    expect(r[1].logs).toBe(2);
    expect(r[1].avg).toBeCloseTo((3 + 1) / 2 / 6); // 6 GI fields, averaged
    expect(r[0].avg).toBeNull();
    expect(r[5].logs).toBe(0);
  });
  it('has no invented values with no data', () => {
    expect(recoveryPattern([], doses).every((p) => p.avg === null && p.logs === 0)).toBe(true);
  });
});

describe('symptomOverview', () => {
  it('counts days present, peak and a trend only with 6+ logs', () => {
    const few = symptomOverview([eff('a', at(6, 1), { nausea: 'mild' }), eff('b', at(6, 2))]);
    expect(few[0]).toMatchObject({ label: 'Nausea', daysPresent: 1, daysLogged: 2, peak: 'mild', trend: null });
    const many = symptomOverview([1, 2, 3, 4, 5, 6].map((d) => eff(`e${d}`, at(6, d), { nausea: d <= 3 ? 'moderate' : 'none' })));
    expect(many[0]).toMatchObject({ label: 'Nausea', daysPresent: 3, peak: 'moderate', trend: 'less often' });
  });
  it('omits symptoms that were never logged and includes custom ones', () => {
    const rows = symptomOverview([eff('a', at(6, 1), { customEffects: { Headache: 'mild' } })]);
    expect(rows.map((r) => r.label)).toEqual(['Headache']);
  });
});

describe('heatmap, appetite and dose comparison', () => {
  it('marks periods without logs as null, not "none"', () => {
    const g = symptomHeatmap([eff('a', at(4, 10), { nausea: 'mild' }), eff('b', at(6, 10))], 'months');
    const nausea = g.rows.find((r) => r.label === 'Nausea')!;
    expect(g.headers).toHaveLength(2);
    expect(nausea.cells).toEqual(['mild', 'none']);
  });
  it('averages hunger and food noise per month', () => {
    const t = appetiteTrend([eff('a', at(6, 1), { hunger: 'severe' }), eff('b', at(6, 2), { hunger: 'none' })]);
    expect(t).toHaveLength(1);
    expect(t[0].hunger).toBe(1.5);
    expect(t[0].logs).toBe(2);
  });
  it('compares only doses that have logs', () => {
    const c = doseSymptomComparison([eff('a', at(6, 2), { nausea: 'moderate' }), eff('b', at(6, 9), { nausea: 'severe' })], doses);
    expect(c.doses).toEqual([{ label: 'Tirzepatide 2.5 mg', logs: 1 }, { label: 'Tirzepatide 5 mg', logs: 1 }]);
    expect(c.symptoms.find((s) => s.symptom === 'Nausea')).toMatchObject({ 'Tirzepatide 2.5 mg': 2, 'Tirzepatide 5 mg': 3 });
    expect(doseSymptomComparison([], doses).doses).toEqual([]);
  });
  it('summarises one injection and says nothing when there are no logs', () => {
    const d = injectionDetail([eff('a', at(6, 3), { fatigue: 'mild' })], doses, 'd1');
    expect(d.logs).toBe(1);
    expect(d.averages.find((x) => x.label === 'Fatigue')!.avg).toBe(1);
    expect(injectionDetail([], doses, 'd1')).toEqual({ logs: 0, averages: [] });
  });
});
