import { describe, it, expect } from 'vitest';
import type { DoseEvent } from '../types';
import { calculateShotPhase } from './glp1Utils';

const NOW = new Date(2026, 5, 15, 20, 0, 0);
const at = (daysAgo: number, hour: number) => new Date(2026, 5, 15 - daysAgo, hour, 0, 0).toISOString();

describe('the phase info has no unused calendar-day countdown (RV09)', () => {
  const dose = (daysAgo: number): DoseEvent => ({ id: 'd', date: at(daysAgo, 12), amountMg: 5, medication: 'Tirzepatide', site: 'x', painLevel: 0, notes: '' });
  it('returns nextDoseDate but no daysUntilNext, in every phase', () => {
    for (const days of [0, 1, 3, 4, 5.5, 6.5, 9]) {
      const info = calculateShotPhase([dose(days)], NOW) as unknown as Record<string, unknown>;
      expect(info).not.toHaveProperty('daysUntilNext');
      expect(info.nextDoseDate).toBeInstanceOf(Date);
    }
    expect(calculateShotPhase([], NOW) as unknown as Record<string, unknown>).not.toHaveProperty('daysUntilNext');
  });
});
