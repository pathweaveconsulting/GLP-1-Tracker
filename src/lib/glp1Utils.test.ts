import { describe, it, expect } from 'vitest';
import type { DoseEvent, Medication } from '../types';
import { calculateMedicationLevelAtDate, calculateShotPhase, generatePKCurve, singleDoseLevel } from './glp1Utils';

const NOW = new Date(2026, 5, 15, 12, 0, 0);
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();
const dose = (id: string, d: number, mg: number, medication: Medication = 'Tirzepatide'): DoseEvent => ({ id, date: daysAgo(d), amountMg: mg, medication, site: 'x', painLevel: 0, notes: '' });

describe('singleDoseLevel', () => {
  it('is zero before and at injection and decays toward zero', () => {
    expect(singleDoseLevel(5, -1, 5)).toBe(0);
    expect(singleDoseLevel(5, 0, 5)).toBe(0);
    expect(singleDoseLevel(5, 100, 5)).toBeLessThan(0.001);
  });
  it('halves roughly every half-life once absorption is done', () => {
    const a = singleDoseLevel(10, 10, 5);
    const b = singleDoseLevel(10, 15, 5);
    expect(b / a).toBeCloseTo(0.5, 2);
  });
  it('handles ka == ke without dividing by zero', () => {
    const v = singleDoseLevel(10, 2, 0.5, 0.5); // elimination half-life == absorption half-life
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThan(0);
    const near = singleDoseLevel(10, 2, 0.5, 0.5000001);
    expect(v).toBeCloseTo(near, 3); // continuous across the singularity
  });
});

describe('calculateMedicationLevelAtDate', () => {
  it('uses each drug’s own half-life', () => {
    const t = singleDoseLevel(5, 14, 5);
    const s = singleDoseLevel(5, 14, 7);
    expect(calculateMedicationLevelAtDate([dose('a', 14, 5, 'Tirzepatide')], NOW)).toBeCloseTo(t, 2);
    expect(calculateMedicationLevelAtDate([dose('b', 14, 5, 'Semaglutide')], NOW)).toBeCloseTo(s, 2);
    expect(s).toBeGreaterThan(t);
  });
  it('filters by medication and ignores medications with no data', () => {
    const doses = [dose('a', 3, 5, 'Tirzepatide'), dose('b', 3, 1, 'Semaglutide'), dose('c', 3, 9, 'Other')];
    const tir = calculateMedicationLevelAtDate(doses, NOW, 'Tirzepatide');
    const sem = calculateMedicationLevelAtDate(doses, NOW, 'Semaglutide');
    expect(calculateMedicationLevelAtDate(doses, NOW, 'Other')).toBe(0);
    expect(calculateMedicationLevelAtDate(doses, NOW)).toBeCloseTo(tir + sem, 1);
  });
});

describe('generatePKCurve headline', () => {
  const mixed = [dose('a', 30, 5, 'Tirzepatide'), dose('b', 23, 5, 'Tirzepatide'), dose('c', 2, 0.5, 'Semaglutide')];
  it('describes only the most recently dosed medication and exposes mixedMedications', () => {
    const pk = generatePKCurve(mixed, '3 months', NOW);
    expect(pk.medicationName).toBe('Semaglutide');
    expect(pk.mixedMedications).toBe(true);
    expect(pk.currentLevel).toBeCloseTo(calculateMedicationLevelAtDate(mixed, NOW, 'Semaglutide'), 2);
    expect(pk.currentLevel).toBeLessThan(1); // not inflated by the tirzepatide doses
    expect(pk.medicationsList.sort()).toEqual(['semaglutide', 'tirzepatide']);
    expect(pk.percentOfPeak).toBeGreaterThan(0);
    expect(pk.percentOfPeak).toBeLessThanOrEqual(100);
  });
  it('reports a single medication as not mixed and ignores "Other" for the model', () => {
    const one = generatePKCurve([dose('a', 3, 5)], '2 weeks', NOW);
    expect(one.mixedMedications).toBe(false);
    expect(one.modelled).toBe(true);
    const other = generatePKCurve([dose('a', 3, 5, 'Other')], '2 weeks', NOW);
    expect(other.modelled).toBe(false);
    expect(other.currentLevel).toBe(0);
  });
  it('peak does not change with the chart timeframe', () => {
    const doses = [dose('a', 60, 7.5), dose('b', 53, 7.5), dose('c', 2, 2.5)];
    const a = generatePKCurve(doses, '2 weeks', NOW);
    const b = generatePKCurve(doses, 'All time', NOW);
    expect(a.peakLevel).toBe(b.peakLevel);
    expect(a.percentOfPeak).toBe(b.percentOfPeak);
  });
  it('returns an empty, non-NaN result with no doses', () => {
    const pk = generatePKCurve([], '3 months', NOW);
    expect(pk.points).toEqual([]);
    expect(pk.currentLevel).toBe(0);
  });
});

describe('calculateShotPhase wording', () => {
  const all = [0.2, 1, 3, 4, 5.5, 6.5, 9].map((d) => calculateShotPhase([dose('a', d, 5)], NOW));
  it('covers every phase', () => {
    expect(all.map((p) => p.phaseNumber)).toEqual([1, 2, 3, 4, 5, 6, 6]);
  });
  it('has dropped absolute physiology claims', () => {
    const text = all.map((p) => `${p.now} ${p.watch} ${p.do}`).join(' ');
    expect(text).not.toMatch(/glucagon|ghrelin|calorie burn/i);
    expect(text).toMatch(/often|typically|usually|commonly/i);
  });
  it('late-dose text says not to double up and does not tell you to inject now', () => {
    const late = all[all.length - 1];
    expect(late.title).toMatch(/Past Your Usual Interval/);
    expect(late.now).toMatch(/never take a double dose/i);
    expect(late.now).not.toMatch(/time for your next/i);
  });
  it('does not pretend to know the cycle for an unknown medication', () => {
    const p = calculateShotPhase([dose('a', 3, 5, 'Other')], NOW);
    expect(p.phaseNumber).toBe(0);
  });
});
