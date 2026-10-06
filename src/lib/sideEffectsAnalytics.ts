import type { DoseEvent, EffectEntry, Severity } from '../types';
import { localDayDiff } from './dates';
import { SEVERITY_RANK, sevOf, sortEffects, trackedFields, dailySymptomEntries } from './symptoms';
import { sortByDate } from './insights';

/** Side-effect fields that describe how the body is coping (used for "recovery" and dose comparison). */
const GI_FIELDS = ['nausea', 'fatigue', 'diarrhea', 'constipation', 'bloating', 'reflux'] as const;
const APPETITE_FIELDS = ['hunger', 'foodNoise', 'appetiteLoss', 'cravings'];
const SEV_BY_RANK: Severity[] = ['none', 'mild', 'moderate', 'severe'];

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export interface SymptomOverviewRow {
  key: string;
  label: string;
  daysPresent: number;
  daysLogged: number;
  peak: Severity;
  /** Average severity (1 mild - 3 severe) on days it was present. */
  avgWhenPresent: number | null;
  /** Needs 6+ logged local days: compares presence rates using each day’s peak severity. */
  trend: 'less often' | 'about the same' | 'more often' | null;
}

export function symptomOverview(effects: EffectEntry[]): SymptomOverviewRow[] {
  const sorted = dailySymptomEntries(effects);
  const half = Math.floor(sorted.length / 2);
  const older = sorted.slice(0, half);
  const newer = sorted.slice(half);
  const rows: SymptomOverviewRow[] = [];
  const handle = (key: string, label: string, get: (e: EffectEntry) => Severity) => {
    const present = sorted.map((e) => SEVERITY_RANK[get(e)]).filter((v) => v > 0);
    if (present.length === 0) return;
    const rate = (xs: EffectEntry[]) => (xs.length ? xs.filter((e) => SEVERITY_RANK[get(e)] > 0).length / xs.length : 0);
    let trend: SymptomOverviewRow['trend'] = null;
    if (sorted.length >= 6) {
      const d = rate(newer) - rate(older);
      trend = d <= -0.15 ? 'less often' : d >= 0.15 ? 'more often' : 'about the same';
    }
    rows.push({
      key,
      label,
      daysPresent: present.length,
      daysLogged: sorted.length,
      peak: SEV_BY_RANK[Math.max(...present)],
      avgWhenPresent: mean(present),
      trend,
    });
  };
  for (const f of trackedFields(sorted)) {
    // Appetite items are not side effects; the appetite chart covers them.
    if (APPETITE_FIELDS.includes(f.key)) continue;
    handle(f.key, f.label, (e) => sevOf(e, f.key));
  }
  const customs = new Set<string>();
  sorted.forEach((e) => Object.keys(e.customEffects ?? {}).forEach((n) => customs.add(n)));
  customs.forEach((n) => handle(`custom:${n}`, n, (e) => (e.customEffects?.[n] as Severity | undefined) ?? 'none'));
  return rows.sort((a, b) => b.daysPresent - a.daysPresent);
}

export interface AssignedLog {
  effect: EffectEntry;
  dose: DoseEvent;
  /** Calendar days after that injection (0-6). */
  offset: number;
}

/** Each symptom log is attached to the most recent injection before it, if that was within 0-6 days. */
export function assignLogsToDoses(effects: EffectEntry[], doses: DoseEvent[]): AssignedLog[] {
  const sortedDoses = sortByDate(doses);
  const out: AssignedLog[] = [];
  for (const effect of effects) {
    let owner: DoseEvent | null = null;
    for (const d of sortedDoses) {
      if (localDayDiff(d.date, effect.date) >= 0) owner = d;
      else break;
    }
    if (!owner) continue;
    const offset = localDayDiff(owner.date, effect.date);
    if (offset >= 0 && offset <= 6) out.push({ effect, dose: owner, offset });
  }
  return out;
}

const giScore = (e: EffectEntry) => mean(GI_FIELDS.map((k) => SEVERITY_RANK[sevOf(e, k)]))!;

export interface RecoveryPoint {
  day: string;
  offset: number;
  /** Average across common side effects (0 none - 3 severe); null when nothing was logged that day. */
  avg: number | null;
  logs: number;
}

/** How logged side effects typically look 0-6 days after an injection, from the user's own logs only. */
export function recoveryPattern(effects: EffectEntry[], doses: DoseEvent[]): RecoveryPoint[] {
  const assigned = assignLogsToDoses(effects, doses);
  return Array.from({ length: 7 }, (_, offset) => {
    const at = assigned.filter((a) => a.offset === offset);
    return { day: offset === 0 ? 'Day 0 (shot)' : `Day ${offset}`, offset, avg: at.length ? mean(at.map((a) => giScore(a.effect))) : null, logs: at.length };
  });
}

export interface HeatmapGrid {
  headers: string[];
  rows: Array<{ label: string; cells: Array<Severity | null> }>;
}

/** Peak severity per symptom per month/week. `null` means nothing was logged in that period. */
export function symptomHeatmap(effects: EffectEntry[], mode: 'months' | 'weeks', maxPeriods = 8): HeatmapGrid {
  const sorted = sortEffects(effects);
  const groups = new Map<string, EffectEntry[]>();
  const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' });
  for (const e of sorted) {
    const d = new Date(e.date);
    let key: string;
    if (mode === 'months') key = monthFmt.format(d);
    else {
      const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
      key = `${monday.getMonth() + 1}/${monday.getDate()}`;
    }
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  const headers = Array.from(groups.keys()).slice(-maxPeriods);
  const rows = trackedFields(sorted)
    .filter((f) => !APPETITE_FIELDS.includes(f.key) && f.key !== 'mood' && f.key !== 'energy')
    .map((f) => ({
      label: f.label,
      cells: headers.map((h) => {
        const entries = groups.get(h) ?? [];
        if (entries.length === 0) return null;
        return SEV_BY_RANK[Math.max(...entries.map((e) => SEVERITY_RANK[sevOf(e, f.key)]))];
      }),
    }));
  return { headers, rows };
}

export interface AppetitePoint {
  period: string;
  hunger: number | null;
  foodNoise: number | null;
  logs: number;
}

/** Monthly average hunger and food-noise ratings (0 none - 3 severe) from the user's logs. */
export function appetiteTrend(effects: EffectEntry[]): AppetitePoint[] {
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' });
  const groups = new Map<string, EffectEntry[]>();
  for (const e of sortEffects(effects)) {
    const k = fmt.format(new Date(e.date));
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  return Array.from(groups, ([period, es]) => ({
    period,
    hunger: mean(es.map((e) => SEVERITY_RANK[sevOf(e, 'hunger')])),
    foodNoise: mean(es.map((e) => SEVERITY_RANK[sevOf(e, 'foodNoise')])),
    logs: es.length,
  }));
}

/** Average side-effect severity in the week after injections, grouped by dose (descriptive only). */
export function doseSymptomComparison(effects: EffectEntry[], doses: DoseEvent[]) {
  const assigned = assignLogsToDoses(effects, doses);
  const doseLabel = (d: DoseEvent) => `${d.medication} ${d.amountMg} mg`;
  const labels = Array.from(new Set(sortByDate(doses).map(doseLabel)));
  const groups = labels.map((label) => ({ label, items: assigned.filter((a) => doseLabel(a.dose) === label) })).filter((g) => g.items.length > 0);
  const fields = trackedFields(effects).filter((f) => (GI_FIELDS as readonly string[]).includes(f.key));
  const symptoms = fields.map((f) => {
    const row: Record<string, string | number> = { symptom: f.label };
    for (const g of groups) row[g.label] = Number(mean(g.items.map((a) => SEVERITY_RANK[sevOf(a.effect, f.key)]))!.toFixed(2));
    return row;
  });
  return { doses: groups.map((g) => ({ label: g.label, logs: g.items.length })), symptoms };
}

export interface InjectionDetail {
  logs: number;
  averages: Array<{ label: string; avg: number }>;
}

/** Average severity per symptom in the week after one specific injection. */
export function injectionDetail(effects: EffectEntry[], doses: DoseEvent[], doseId: string): InjectionDetail {
  const mine = assignLogsToDoses(effects, doses).filter((a) => a.dose.id === doseId);
  const fields = trackedFields(effects).filter((f) => !['cravings', 'mood', 'energy'].includes(f.key));
  return {
    logs: mine.length,
    averages: mine.length ? fields.map((f) => ({ label: f.label, avg: mean(mine.map((a) => SEVERITY_RANK[sevOf(a.effect, f.key)]))! })) : [],
  };
}
