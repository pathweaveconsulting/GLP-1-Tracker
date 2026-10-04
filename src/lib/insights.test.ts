import { describe, it, expect } from 'vitest';
import type { DoseEvent, WeightEntry } from '../types';
import {
  weeklyRate, projectGoal, weightMilestones, bestMonth, weeklyChanges, detectPlateaus, currentPlateau,
  nextDoseInfo, doseLevelHistory, doseCountsByAmount, dosesBySite, NEEDS_MORE_WEIGHT_DATA,
} from './insights';

const NOW = new Date(2026, 5, 15, 10, 0, 0); // 15 Jun 2026, local
const at = (daysAgo: number) => new Date(2026, 5, 15 - daysAgo, 12, 0, 0).toISOString();
const w = (daysAgo: number, lbs: number): WeightEntry => ({ id: `w${daysAgo}`, date: at(daysAgo), weightLbs: lbs });
const dose = (daysAgo: number, mg: number, medication: DoseEvent['medication'] = 'Tirzepatide'): DoseEvent => ({
  id: `d${daysAgo}`, date: at(daysAgo), amountMg: mg, medication, site: 'Abdomen: Lower Mid', painLevel: 0, notes: '',
});

describe('weeklyRate', () => {
  it('returns null with fewer than 3 weigh-ins', () => {
    expect(weeklyRate([w(14, 200), w(0, 198)], NOW)).toBeNull();
  });
  it('returns null when 3 weigh-ins span less than 14 days', () => {
    expect(weeklyRate([w(10, 200), w(5, 199), w(0, 198)], NOW)).toBeNull();
  });
  it('ignores weigh-ins older than the 56-day window', () => {
    expect(weeklyRate([w(100, 220), w(90, 215), w(80, 210)], NOW)).toBeNull();
  });
  it('fits a least-squares slope in pounds per week', () => {
    // exactly -1 lb every 7 days
    const r = weeklyRate([w(28, 200), w(21, 199), w(14, 198), w(7, 197), w(0, 196)], NOW)!;
    expect(r.lbsPerWeek).toBeCloseTo(-1, 6);
    expect(r.points).toBe(5);
    expect(r.spanDays).toBe(28);
  });
  it('reports a gain as a positive rate', () => {
    const r = weeklyRate([w(28, 190), w(14, 192), w(0, 194)], NOW)!;
    expect(r.lbsPerWeek).toBeCloseTo(1, 6);
  });
  it('is not thrown off by entry order', () => {
    const r = weeklyRate([w(0, 196), w(28, 200), w(14, 198)], NOW)!;
    expect(r.lbsPerWeek).toBeCloseTo(-1, 6);
  });
});

describe('projectGoal', () => {
  const base = { startLbs: 200, targetLbs: 180, now: NOW };
  it('refuses to guess without enough data', () => {
    const p = projectGoal({ ...base, weights: [w(0, 195)] });
    expect(p).toEqual({ status: 'unknown', reason: NEEDS_MORE_WEIGHT_DATA });
  });
  it('refuses when there is no goal', () => {
    expect(projectGoal({ ...base, targetLbs: 0, weights: [w(28, 200), w(14, 198), w(0, 196)] }).status).toBe('unknown');
  });
  it('projects a date from the recent pace', () => {
    const weights = [w(28, 200), w(21, 199), w(14, 198), w(7, 197), w(0, 196)];
    const p = projectGoal({ ...base, weights });
    expect(p.status).toBe('projected');
    if (p.status === 'projected') {
      expect(p.weeks).toBeCloseTo(16, 5); // 16 lb to go at 1 lb/week
      expect(p.date.getTime() - new Date(at(0)).getTime()).toBeCloseTo(16 * 7 * 86_400_000, -3);
    }
  });
  it('says reached when already at or below goal', () => {
    expect(projectGoal({ ...base, weights: [w(0, 179)] }).status).toBe('reached');
  });
  it('refuses when the trend is flat or moving away', () => {
    const flat = projectGoal({ ...base, weights: [w(28, 196), w(14, 196), w(0, 196)] });
    expect(flat.status).toBe('unknown');
    const up = projectGoal({ ...base, weights: [w(28, 194), w(14, 195), w(0, 196)] });
    expect(up.status).toBe('unknown');
  });
  it('refuses when the last weigh-in is stale', () => {
    const p = projectGoal({ ...base, weights: [w(50, 200), w(40, 199), w(30, 198)] });
    expect(p.status).toBe('unknown');
    if (p.status === 'unknown') expect(p.reason).toMatch(/30 days ago/);
  });
  it('refuses absurdly distant dates', () => {
    const weights = [w(28, 200.4), w(14, 200.2), w(0, 200)]; // 0.1 lb/week toward a 100 lb loss
    expect(projectGoal({ weights, startLbs: 200, targetLbs: 100, now: NOW }).status).toBe('unknown');
  });
});

describe('weightMilestones', () => {
  it('marks reached milestones with their first date and leaves the rest open', () => {
    const weights = [w(60, 200), w(40, 189), w(20, 179), w(0, 179)];
    const m = weightMilestones({ weights, startLbs: 200, targetLbs: 150 });
    const byId = Object.fromEntries(m.map((x) => [x.id, x]));
    expect(byId['pct-5'].reached).toBe(true);
    expect(byId['pct-5'].date).toBe(at(40));
    expect(byId['pct-10'].reached).toBe(true);
    expect(byId['pct-10'].date).toBe(at(20));
    expect(byId['pct-15'].reached).toBe(false);
    expect(byId['pct-15'].date).toBeNull();
    expect(byId['goal'].reached).toBe(false);
  });
  it('never offers a milestone beyond the goal and tolerates a missing goal', () => {
    const m = weightMilestones({ weights: [], startLbs: 200, targetLbs: 185 });
    expect(m.map((x) => x.id)).toEqual(['pct-5', 'goal']);
    expect(weightMilestones({ weights: [], startLbs: 200, targetLbs: 0 })).toEqual([]);
  });
});

describe('bestMonth / weeklyChanges / plateaus', () => {
  it('finds the month with the largest first-to-last drop, ignoring single-entry months', () => {
    const weights = [
      { id: 'a', date: new Date(2026, 0, 3, 12).toISOString(), weightLbs: 210 },
      { id: 'b', date: new Date(2026, 0, 28, 12).toISOString(), weightLbs: 207 },
      { id: 'c', date: new Date(2026, 1, 2, 12).toISOString(), weightLbs: 206 },
      { id: 'd', date: new Date(2026, 1, 25, 12).toISOString(), weightLbs: 200 },
      { id: 'e', date: new Date(2026, 2, 5, 12).toISOString(), weightLbs: 190 }, // lone March entry
    ];
    const b = bestMonth(weights)!;
    expect(b.key).toBe('2026-02');
    expect(b.lossLbs).toBeCloseTo(6);
  });
  it('returns null when nothing dropped', () => {
    expect(bestMonth([w(10, 190), w(0, 192)])).toBeNull();
  });
  it('computes week-over-week change only between consecutive weeks', () => {
    // Mon 1 Jun, Mon 8 Jun are consecutive; 25 May has a gap-free neighbour too.
    const weights = [
      { id: '1', date: new Date(2026, 4, 26, 12).toISOString(), weightLbs: 200 },
      { id: '2', date: new Date(2026, 5, 2, 12).toISOString(), weightLbs: 199 },
      { id: '3', date: new Date(2026, 5, 3, 12).toISOString(), weightLbs: 197 },
      { id: '4', date: new Date(2026, 5, 24, 12).toISOString(), weightLbs: 190 }, // 2-week gap before
    ];
    const ch = weeklyChanges(weights);
    expect(ch).toHaveLength(1);
    expect(ch[0].deltaLbs).toBeCloseTo(-2);
  });
  it('detects a plateau and flags it as current only when recent', () => {
    const weights = [w(60, 200), w(50, 196), w(40, 192), w(28, 191.5), w(14, 191.8), w(1, 191.6)];
    const p = detectPlateaus(weights);
    expect(p).toHaveLength(1);
    expect(p[0].weighIns).toBe(4);
    expect(currentPlateau(weights, NOW)?.days).toBeGreaterThanOrEqual(14);
    expect(currentPlateau(weights.slice(0, -1), NOW)).toBeNull();
  });
  it('does not call a steady decline a plateau', () => {
    expect(detectPlateaus([w(28, 200), w(21, 199), w(14, 198), w(7, 197), w(0, 196)])).toEqual([]);
  });
});

describe('nextDoseInfo', () => {
  it('has nothing for no doses', () => {
    expect(nextDoseInfo([], NOW)).toEqual({ lastDose: null, medication: null, dueDate: null, daysUntil: null });
  });
  it('counts calendar days to the next weekly dose, negative when overdue', () => {
    expect(nextDoseInfo([dose(5, 5)], NOW).daysUntil).toBe(2);
    expect(nextDoseInfo([dose(9, 5)], NOW).daysUntil).toBe(-2);
  });
  it('uses the most recent dose regardless of order and has no schedule for Other', () => {
    expect(nextDoseInfo([dose(1, 5), dose(8, 2.5)], NOW).lastDose?.amountMg).toBe(5);
    expect(nextDoseInfo([dose(1, 5, 'Other')], NOW).dueDate).toBeNull();
  });
});

describe('doseLevelHistory', () => {
  it('describes observed change per dose level and skips levels without enough weigh-ins', () => {
    const doses = [dose(56, 2.5), dose(49, 2.5), dose(42, 2.5), dose(35, 5), dose(28, 5), dose(21, 5), dose(14, 7.5), dose(7, 7.5)];
    const weights = [w(55, 200), w(46, 198), w(36, 196), w(30, 195), w(22, 193), w(13, 192.5), w(2, 192)];
    const rows = doseLevelHistory(doses, weights, NOW);
    const by = Object.fromEntries(rows.map((r) => [r.amountMg, r]));
    // 2.5 mg period: weigh-ins 55, 46, 36 days ago (200 -> 196 over 19 days)
    expect(by[2.5].weighIns).toBe(3);
    expect(by[2.5].lbsPerWeek).toBeCloseTo((-4 / 19) * 7, 5);
    // 5 mg period: weigh-ins 30 and 22 days ago (195 -> 193 over 8 days)
    expect(by[5].weighIns).toBe(2);
    expect(by[5].lbsPerWeek).toBeCloseTo((-2 / 8) * 7, 5);
    // 7.5 mg period: weigh-ins 13 and 2 days ago (192.5 -> 192 over 11 days)
    expect(by[7.5].lbsPerWeek).toBeCloseTo((-0.5 / 11) * 7, 5);
  });
  it('leaves out a level with fewer than 7 days of weigh-ins', () => {
    const rows = doseLevelHistory([dose(30, 2.5), dose(10, 5)], [w(29, 200), w(20, 199), w(9, 198), w(7, 197.5)], NOW);
    expect(rows.map((r) => r.amountMg)).toEqual([2.5]);
  });
});

describe('counts', () => {
  it('counts doses by amount and by site', () => {
    const ds = [dose(1, 5), dose(8, 5), dose(15, 2.5)];
    expect(doseCountsByAmount(ds).map((x) => [x.amountMg, x.count])).toEqual([[2.5, 1], [5, 2]]);
    expect(dosesBySite(ds)).toEqual([{ site: 'Abdomen: Lower Mid', count: 3 }]);
  });
});

describe('weeklyRate across a daylight-saving change', () => {
  // Finds the first local day in 2026 whose UTC offset differs from the previous day (if this timezone has DST).
  function dstDay(): Date | null {
    for (let d = new Date(2026, 0, 2, 12); d.getFullYear() === 2026; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12)) {
      const prev = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 12);
      if (prev.getTimezoneOffset() !== d.getTimezoneOffset()) return d;
    }
    return null;
  }
  it('entries exactly 14 calendar days apart count as a 14-day span even when the clocks change in between', () => {
    const t = dstDay();
    if (!t) return; // no DST in this timezone: nothing to check (the NY / Auckland / LA CI runs do)
    const at = (offsetDays: number, lbs: number): WeightEntry => ({ id: `d${offsetDays}`, weightLbs: lbs, date: new Date(t.getFullYear(), t.getMonth(), t.getDate() + offsetDays, 12).toISOString() });
    const weights = [at(-7, 204), at(0, 202), at(7, 200)];
    const now = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 8, 10);
    const r = weeklyRate(weights, now);
    expect(r).not.toBeNull();
    expect(r!.spanDays).toBe(14);
    expect(r!.lbsPerWeek).toBeCloseTo(-2, 1); // -4 lb over 14 days, even though the real elapsed time is 13.96 or 14.04 days
  });
});
