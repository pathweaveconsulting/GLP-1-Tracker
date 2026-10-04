import type { DoseEvent, EffectEntry, WeightEntry } from '../types';
import { sortByDate } from './insights';
import { summarizeSymptoms, SymptomSummary } from './symptoms';

export type ReportKind = 'weekly' | 'monthly';

export interface PeriodRange {
  kind: ReportKind;
  start: Date; // local midnight, inclusive
  end: Date; // local 23:59:59.999 of the last day, inclusive
}

/** The weekly (Monday to Sunday) or calendar-month period containing `anchor`, in local time. */
export function periodFor(kind: ReportKind, anchor: Date): PeriodRange {
  if (kind === 'monthly') {
    return {
      kind,
      start: new Date(anchor.getFullYear(), anchor.getMonth(), 1),
      end: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }
  const dow = (anchor.getDay() + 6) % 7;
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - dow);
  return { kind, start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999) };
}

/** Move one period back (-1) or forward (+1). */
export function shiftPeriod(range: PeriodRange, dir: -1 | 1): PeriodRange {
  const a = range.start;
  const anchor =
    range.kind === 'monthly'
      ? new Date(a.getFullYear(), a.getMonth() + dir, 1)
      : new Date(a.getFullYear(), a.getMonth(), a.getDate() + dir * 7);
  return periodFor(range.kind, anchor);
}

const within = (iso: string, r: PeriodRange) => {
  const t = new Date(iso).getTime();
  return t >= r.start.getTime() && t <= r.end.getTime();
};

export interface PeriodReport {
  range: PeriodRange;
  weights: {
    entries: WeightEntry[];
    first: WeightEntry | null;
    last: WeightEntry | null;
    /** Pounds, last minus first within the period; null with fewer than 2 entries. */
    changeLbs: number | null;
    averageLbs: number | null;
  };
  doses: {
    entries: DoseEvent[];
    /** Set when the first dose in the period differs from the dose logged just before the period. */
    changedFrom: { amountMg: number; medication: DoseEvent['medication'] } | null;
  };
  symptoms: Omit<SymptomSummary, 'windowDays'>;
  isEmpty: boolean;
}

export function buildPeriodReport(args: { doses: DoseEvent[]; weights: WeightEntry[]; effects: EffectEntry[]; range: PeriodRange }): PeriodReport {
  const { range } = args;
  const w = sortByDate(args.weights.filter((x) => within(x.date, range)));
  const d = sortByDate(args.doses.filter((x) => within(x.date, range)));
  const before = sortByDate(args.doses.filter((x) => new Date(x.date).getTime() < range.start.getTime()));
  const prev = before[before.length - 1];
  const firstDose = d[0];
  const changedFrom =
    prev && firstDose && (prev.amountMg !== firstDose.amountMg || prev.medication !== firstDose.medication)
      ? { amountMg: prev.amountMg, medication: prev.medication }
      : null;
  const symptoms = summarizeSymptoms(args.effects, range.start, range.end);
  return {
    range,
    weights: {
      entries: w,
      first: w[0] ?? null,
      last: w[w.length - 1] ?? null,
      changeLbs: w.length >= 2 ? w[w.length - 1].weightLbs - w[0].weightLbs : null,
      averageLbs: w.length ? w.reduce((a, b) => a + b.weightLbs, 0) / w.length : null,
    },
    doses: { entries: d, changedFrom },
    symptoms,
    isEmpty: w.length === 0 && d.length === 0 && symptoms.daysLogged === 0,
  };
}
