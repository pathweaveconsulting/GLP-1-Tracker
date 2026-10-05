import type { DoseEvent, Medication, WeightEntry } from '../types';
import { addCalendarDays, localDayDiff, toLocalDateString } from './dates';
import { dosingIntervalDays } from './medications';

const DAY_MS = 86_400_000;

export const RATE_WINDOW_DAYS = 56;
export const MIN_RATE_POINTS = 3;
export const MIN_RATE_SPAN_DAYS = 14;
/** Distinct local calendar days the weigh-ins must fall on (three rows on two days are not three measurements of a trend). */
const MIN_RATE_DISTINCT_DAYS = 3;
/** Below this pace (lb/week) a trend is indistinguishable from scale noise, so no goal date is offered. */
export const MIN_PROJECTABLE_RATE = 0.1;
export const MAX_PROJECTION_WEEKS = 156;
export const STALE_WEIGH_IN_DAYS = 21;

export const NEEDS_MORE_WEIGHT_DATA = 'Needs 3+ weigh-ins over 2+ weeks';

export function sortByDate<T extends { date: string }>(rows: T[], dir: 'asc' | 'desc' = 'asc'): T[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => sign * (new Date(a.date).getTime() - new Date(b.date).getTime()));
}

export function latestWeight(weights: WeightEntry[]): WeightEntry | null {
  const s = sortByDate(weights);
  return s.length ? s[s.length - 1] : null;
}

export function firstWeight(weights: WeightEntry[]): WeightEntry | null {
  const s = sortByDate(weights);
  return s.length ? s[0] : null;
}

export interface WeeklyRate {
  /** Negative = losing. Pounds per week. */
  lbsPerWeek: number;
  points: number;
  spanDays: number;
}

/**
 * Least-squares weight trend over the last 56 days. Requires at least 3 weigh-ins on 3 different
 * local days that span at least 14 days; otherwise returns null (we say so instead of guessing).
 */
export function weeklyRate(weights: WeightEntry[], now: Date = new Date()): WeeklyRate | null {
  const nowMs = now.getTime();
  const pts = sortByDate(weights)
    .map((w) => ({ t: new Date(w.date).getTime(), y: w.weightLbs }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.y) && p.t >= nowMs - RATE_WINDOW_DAYS * DAY_MS && p.t <= nowMs + DAY_MS);
  if (pts.length < MIN_RATE_POINTS) return null;
  if (new Set(pts.map((p) => toLocalDateString(new Date(p.t)))).size < MIN_RATE_DISTINCT_DAYS) return null;
  const t0 = pts[0].t;
  // Days on the local calendar: a clock change in between must not turn 14 calendar days into 13.96 or 14.04.
  const off0 = new Date(t0).getTimezoneOffset();
  const xs = pts.map((p) => (p.t - t0) / DAY_MS - (new Date(p.t).getTimezoneOffset() - off0) / 1440);
  const spanDays = xs[xs.length - 1];
  if (spanDays < MIN_RATE_SPAN_DAYS) return null;
  const n = pts.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = pts.reduce((a, p) => a + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (pts[i].y - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return null;
  return { lbsPerWeek: (num / den) * 7, points: n, spanDays: Math.round(spanDays) };
}

export type GoalProjection =
  | { status: 'reached' }
  | { status: 'unknown'; reason: string }
  | { status: 'projected'; date: Date; weeks: number; lbsPerWeek: number };

/** Projects a goal date from the recent trend, and refuses when the data cannot support one. */
export function projectGoal(args: {
  weights: WeightEntry[];
  startLbs: number | null | undefined;
  targetLbs: number | null | undefined;
  now?: Date;
}): GoalProjection {
  const { weights, startLbs, targetLbs } = args;
  const now = args.now ?? new Date();
  const latest = latestWeight(weights);
  if (!targetLbs || targetLbs <= 0) return { status: 'unknown', reason: 'Set a goal weight to see a projection' };
  if (!latest) return { status: 'unknown', reason: NEEDS_MORE_WEIGHT_DATA };

  const wantsLoss = startLbs ? targetLbs < startLbs : targetLbs < latest.weightLbs;
  if (wantsLoss ? latest.weightLbs <= targetLbs : latest.weightLbs >= targetLbs) return { status: 'reached' };

  const rate = weeklyRate(weights, now);
  if (!rate) return { status: 'unknown', reason: NEEDS_MORE_WEIGHT_DATA };

  const age = localDayDiff(latest.date, now);
  if (age > STALE_WEIGH_IN_DAYS) return { status: 'unknown', reason: `Your last weigh-in was ${age} days ago. Log a new one to refresh this` };

  const towardGoal = wantsLoss ? -rate.lbsPerWeek : rate.lbsPerWeek;
  if (towardGoal < MIN_PROJECTABLE_RATE) return { status: 'unknown', reason: 'Your recent trend is flat or moving away from your goal, so a date would be a guess' };

  const weeks = Math.abs(latest.weightLbs - targetLbs) / towardGoal;
  if (weeks > MAX_PROJECTION_WEEKS) return { status: 'unknown', reason: 'At your recent pace the goal is more than 3 years away, too far to estimate' };

  return { status: 'projected', date: addCalendarDays(new Date(latest.date), weeks * 7), weeks, lbsPerWeek: rate.lbsPerWeek };
}

export interface Milestone {
  id: string;
  label: string;
  reached: boolean;
  /** ISO date of the first weigh-in at or past the milestone. */
  date: string | null;
}

/** Percent-of-starting-weight milestones (5/10/15/20%) up to the goal, plus the goal itself. */
export function weightMilestones(args: { weights: WeightEntry[]; startLbs: number | null | undefined; targetLbs: number | null | undefined }): Milestone[] {
  const { startLbs, targetLbs } = args;
  if (!startLbs || startLbs <= 0 || !targetLbs || targetLbs <= 0 || targetLbs >= startLbs) return [];
  const sorted = sortByDate(args.weights);
  const firstAtOrBelow = (lbs: number) => sorted.find((w) => w.weightLbs <= lbs) ?? null;
  const out: Milestone[] = [];
  for (const pct of [5, 10, 15, 20, 25]) {
    const threshold = startLbs * (1 - pct / 100);
    if (threshold <= targetLbs) break;
    const hit = firstAtOrBelow(threshold);
    out.push({ id: `pct-${pct}`, label: `${pct}% of starting weight lost`, reached: !!hit, date: hit?.date ?? null });
  }
  const goalHit = firstAtOrBelow(targetLbs);
  out.push({ id: 'goal', label: 'Goal weight', reached: !!goalHit, date: goalHit?.date ?? null });
  return out;
}

export interface BestMonth {
  key: string;
  year: number;
  month: number; // 0-11
  lossLbs: number;
}

/** Calendar month with the largest drop between its first and last weigh-in (months with 2+ weigh-ins only). */
export function bestMonth(weights: WeightEntry[]): BestMonth | null {
  const groups = new Map<string, WeightEntry[]>();
  for (const w of sortByDate(weights)) {
    const d = new Date(w.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    groups.set(key, [...(groups.get(key) ?? []), w]);
  }
  let best: BestMonth | null = null;
  groups.forEach((rows, key) => {
    if (rows.length < 2) return;
    const loss = rows[0].weightLbs - rows[rows.length - 1].weightLbs;
    if (loss > 0 && (!best || loss > best.lossLbs)) {
      const d = new Date(rows[0].date);
      best = { key, year: d.getFullYear(), month: d.getMonth(), lossLbs: loss };
    }
  });
  return best;
}

export interface WeeklyChange {
  weekStart: Date;
  /** Change in weekly average vs the previous calendar week (lbs). Negative = loss. */
  deltaLbs: number;
}

function startOfLocalWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - dow);
  return x;
}

/** Week-over-week change in average weight, only between consecutive weeks that both have weigh-ins. */
export function weeklyChanges(weights: WeightEntry[]): WeeklyChange[] {
  const byWeek = new Map<number, { sum: number; n: number; start: Date }>();
  for (const w of weights) {
    const start = startOfLocalWeek(new Date(w.date));
    const k = start.getTime();
    const cur = byWeek.get(k) ?? { sum: 0, n: 0, start };
    cur.sum += w.weightLbs;
    cur.n += 1;
    byWeek.set(k, cur);
  }
  const weeks = Array.from(byWeek.values()).sort((a, b) => a.start.getTime() - b.start.getTime());
  const out: WeeklyChange[] = [];
  for (let i = 1; i < weeks.length; i++) {
    if (localDayDiff(weeks[i - 1].start, weeks[i].start) !== 7) continue;
    out.push({ weekStart: weeks[i].start, deltaLbs: weeks[i].sum / weeks[i].n - weeks[i - 1].sum / weeks[i - 1].n });
  }
  return out;
}

export interface Plateau {
  start: string;
  end: string;
  days: number;
  weighIns: number;
}

/** Runs of 3+ weigh-ins spanning 14+ days that stay within a 1 lb band. Greedy, non-overlapping. */
export function detectPlateaus(weights: WeightEntry[]): Plateau[] {
  const s = sortByDate(weights);
  const out: Plateau[] = [];
  let i = 0;
  while (i < s.length) {
    let min = s[i].weightLbs;
    let max = s[i].weightLbs;
    let j = i;
    while (j + 1 < s.length) {
      const nMin = Math.min(min, s[j + 1].weightLbs);
      const nMax = Math.max(max, s[j + 1].weightLbs);
      if (nMax - nMin > 1) break;
      min = nMin;
      max = nMax;
      j++;
    }
    const days = localDayDiff(s[i].date, s[j].date);
    if (j - i + 1 >= 3 && days >= 14) {
      out.push({ start: s[i].date, end: s[j].date, days, weighIns: j - i + 1 });
      i = j + 1;
    } else {
      i++;
    }
  }
  return out;
}

/** A plateau that is still ongoing: it ends at the latest weigh-in, which is recent. */
export function currentPlateau(weights: WeightEntry[], now: Date = new Date()): Plateau | null {
  const last = latestWeight(weights);
  if (!last) return null;
  const hit = detectPlateaus(weights).find((p) => p.end === last.date);
  return hit && localDayDiff(last.date, now) <= 7 ? hit : null;
}

export interface NextDoseInfo {
  lastDose: DoseEvent | null;
  medication: Medication | null;
  /** Null when the medication has no known schedule. */
  dueDate: Date | null;
  /** Calendar days until due; negative when overdue. */
  daysUntil: number | null;
}

export function lastDoseOf(doses: DoseEvent[]): DoseEvent | null {
  const s = sortByDate(doses);
  return s.length ? s[s.length - 1] : null;
}

export function nextDoseInfo(doses: DoseEvent[], now: Date = new Date()): NextDoseInfo {
  const lastDose = lastDoseOf(doses);
  if (!lastDose) return { lastDose: null, medication: null, dueDate: null, daysUntil: null };
  const interval = dosingIntervalDays(lastDose.medication);
  if (interval == null) return { lastDose, medication: lastDose.medication, dueDate: null, daysUntil: null };
  const dueDate = addCalendarDays(new Date(lastDose.date), interval);
  return { lastDose, medication: lastDose.medication, dueDate, daysUntil: localDayDiff(now, dueDate) };
}

export interface DoseLevelRow {
  medication: Medication;
  amountMg: number;
  /** Days spent on this dose level that had weigh-in coverage. */
  days: number;
  weighIns: number;
  /** Observed pounds/week while on this dose (negative = loss). Descriptive only. */
  lbsPerWeek: number;
}

/**
 * What the user's own weight did while on each dose level. Needs 2+ weigh-ins spanning 7+ days inside
 * a period; periods with less are left out. This is a description of one person's history, not
 * evidence that one dose works better than another.
 */
export function doseLevelHistory(doses: DoseEvent[], weights: WeightEntry[], now: Date = new Date()): DoseLevelRow[] {
  const sortedDoses = sortByDate(doses);
  const sortedWeights = sortByDate(weights);
  if (sortedDoses.length === 0 || sortedWeights.length < 2) return [];

  type Period = { medication: Medication; amountMg: number; start: number; end: number };
  const periods: Period[] = [];
  for (const d of sortedDoses) {
    const t = new Date(d.date).getTime();
    const prev = periods[periods.length - 1];
    if (prev && prev.medication === d.medication && prev.amountMg === d.amountMg) continue;
    if (prev) prev.end = t;
    periods.push({ medication: d.medication, amountMg: d.amountMg, start: t, end: now.getTime() });
  }

  const acc = new Map<string, { medication: Medication; amountMg: number; days: number; weighIns: number; lbsChange: number }>();
  for (const p of periods) {
    const inside = sortedWeights.filter((w) => {
      const t = new Date(w.date).getTime();
      return t >= p.start && t < p.end;
    });
    if (inside.length < 2) continue;
    const days = (new Date(inside[inside.length - 1].date).getTime() - new Date(inside[0].date).getTime()) / DAY_MS;
    if (days < 7) continue;
    const key = `${p.medication}|${p.amountMg}`;
    const cur = acc.get(key) ?? { medication: p.medication, amountMg: p.amountMg, days: 0, weighIns: 0, lbsChange: 0 };
    cur.days += days;
    cur.weighIns += inside.length;
    cur.lbsChange += inside[inside.length - 1].weightLbs - inside[0].weightLbs;
    acc.set(key, cur);
  }
  return Array.from(acc.values())
    .map((r) => ({ medication: r.medication, amountMg: r.amountMg, days: Math.round(r.days), weighIns: r.weighIns, lbsPerWeek: (r.lbsChange / r.days) * 7 }))
    .sort((a, b) => a.amountMg - b.amountMg);
}

/** Count doses per amount, e.g. for a "Dose breakdown" chart. */
export function doseCountsByAmount(doses: DoseEvent[]): Array<{ label: string; amountMg: number; medication: Medication; count: number }> {
  const m = new Map<string, { label: string; amountMg: number; medication: Medication; count: number }>();
  for (const d of doses) {
    const key = `${d.medication}|${d.amountMg}`;
    const cur = m.get(key) ?? { label: `${d.amountMg} mg ${d.medication}`, amountMg: d.amountMg, medication: d.medication, count: 0 };
    cur.count++;
    m.set(key, cur);
  }
  return Array.from(m.values()).sort((a, b) => a.amountMg - b.amountMg);
}

/** Count doses per injection site, most used first. */
export function dosesBySite(doses: DoseEvent[]): Array<{ site: string; count: number }> {
  const m = new Map<string, number>();
  for (const d of doses) m.set(d.site || 'Not recorded', (m.get(d.site || 'Not recorded') ?? 0) + 1);
  return Array.from(m, ([site, count]) => ({ site, count })).sort((a, b) => b.count - a.count || a.site.localeCompare(b.site));
}
