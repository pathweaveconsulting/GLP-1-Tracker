import { describe, it, expect } from 'vitest';
import type { WeightEntry } from '../types';
import { weeklyRate } from './insights';

const NOW = new Date(2026, 5, 15, 20, 0, 0);
const at = (daysAgo: number, hour: number) => new Date(2026, 5, 15 - daysAgo, hour, 0, 0).toISOString();
const w = (daysAgo: number, hour: number, lbs: number): WeightEntry => ({ id: `w${daysAgo}-${hour}`, date: at(daysAgo, hour), weightLbs: lbs });

describe('weeklyRate needs three distinct local days (not just three rows)', () => {
  it('three rows on only two distinct days, 14 days apart, give no rate', () => {
    expect(weeklyRate([w(14, 8, 200), w(0, 8, 198), w(0, 18, 197.5)], NOW)).toBeNull();
    expect(weeklyRate([w(14, 8, 200), w(14, 18, 199.8), w(0, 9, 198)], NOW)).toBeNull();
  });
  it('three rows on three distinct days across 14 days still give a rate', () => {
    const r = weeklyRate([w(14, 8, 200), w(7, 8, 199), w(0, 8, 198)], NOW);
    expect(r).not.toBeNull();
    expect(r!.lbsPerWeek).toBeCloseTo(-1, 5);
  });
  it('two rows on the same day plus one more day plus a third day counts the distinct days', () => {
    expect(weeklyRate([w(14, 8, 200), w(14, 18, 200), w(7, 8, 199), w(0, 8, 198)], NOW)).not.toBeNull();
  });
});

