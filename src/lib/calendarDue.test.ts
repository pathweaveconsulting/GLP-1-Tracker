import { describe, it, expect } from 'vitest';
import type { DoseEvent, WeightEntry } from '../types';
import { nextDoseInfo, projectGoal } from './insights';
import { calculateShotPhase } from './glp1Utils';
import { addCalendarDays } from './dates';

// Local wall-clock times just before a clock change in New York (Mar 8 / Nov 1), Auckland (Sep 27 / Apr 5)
// and Lord Howe (Oct 4 / Apr 5). Each assertion is "same local time, N calendar days later", which holds in
// every timezone, so the file is meaningful under TZ=America/New_York, Pacific/Auckland and Australia/Lord_Howe.
const CASES: Array<[string, [number, number, number, number, number]]> = [
  ['NY spring-forward eve', [2026, 3, 7, 23, 30]],
  ['NY fall-back night', [2026, 11, 1, 0, 30]],
  ['Auckland spring-forward eve', [2026, 9, 26, 23, 30]],
  ['Auckland fall-back eve', [2026, 4, 4, 23, 30]],
  ['Lord Howe spring-forward eve', [2026, 10, 3, 23, 30]],
  ['Lord Howe fall-back eve', [2026, 4, 4, 23, 30]],
];
const local = ([y, m, d, h, mi]: [number, number, number, number, number]) => new Date(y, m - 1, d, h, mi);
const dose = (when: Date, medication: DoseEvent['medication'] = 'Tirzepatide'): DoseEvent => ({
  id: 'd', date: when.toISOString(), amountMg: 5, medication, site: 'Abdomen: Lower Mid', painLevel: 0, notes: '',
});

describe('due dates add calendar days (R2)', () => {
  for (const [name, parts] of CASES) {
    it(`nextDoseInfo: ${name}`, () => {
      const when = local(parts);
      const due = nextDoseInfo([dose(when)], when).dueDate!;
      const want = new Date(parts[0], parts[1] - 1, parts[2] + 7, parts[3], parts[4]);
      expect(due.getTime()).toBe(want.getTime());
    });
    it(`calculateShotPhase.nextDoseDate: ${name}`, () => {
      const when = local(parts);
      const due = calculateShotPhase([dose(when)], when).nextDoseDate;
      const want = new Date(parts[0], parts[1] - 1, parts[2] + 7, parts[3], parts[4]);
      expect(due.getTime()).toBe(want.getTime());
    });
  }
  it('addCalendarDays keeps local time for whole days and adds the remainder as elapsed time', () => {
    const d = new Date(2026, 2, 7, 23, 30);
    expect(addCalendarDays(d, 7).getTime()).toBe(new Date(2026, 2, 14, 23, 30).getTime());
    expect(addCalendarDays(d, 0.5).getTime()).toBe(d.getTime() + 12 * 3600_000);
  });
});

describe('projected goal date adds calendar days (R9)', () => {
  const w = (when: Date, lbs: number): WeightEntry => ({ id: String(lbs), date: when.toISOString(), weightLbs: lbs });
  // Two weeks to go at 2 lb/week, with a clock change in between in NY (Mar 8, Nov 1), Auckland and Lord Howe.
  for (const [name, y, m, d] of [['spring', 2026, 3, 1], ['autumn', 2026, 10, 25]] as const) {
    it(`projects 2 weeks to the same local time two calendar weeks later (${name})`, () => {
      const week1 = new Date(y, m - 1, d - 14, 12, 0);
      const week2 = new Date(y, m - 1, d - 7, 12, 0);
      const last = new Date(y, m - 1, d, 12, 0);
      const now = new Date(y, m - 1, d, 13, 0);
      const res = projectGoal({ weights: [w(week1, 204), w(week2, 202), w(last, 200)], startLbs: 204, targetLbs: 196, now });
      expect(res.status).toBe('projected');
      if (res.status !== 'projected') return;
      expect(res.weeks).toBeCloseTo(2, 5);
      expect(res.date.getTime()).toBe(new Date(y, m - 1, d + 14, 12, 0).getTime());
    });
  }
});
