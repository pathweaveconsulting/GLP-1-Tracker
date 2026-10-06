import type { EffectEntry, Severity } from '../types';
import { localDayDiff, isoToLocalDateString } from './dates';

export const SEVERITIES: readonly Severity[] = ['none', 'mild', 'moderate', 'severe'];
export const SEVERITY_RANK: Record<Severity, number> = { none: 0, mild: 1, moderate: 2, severe: 3 };

export function severityLabel(s: Severity | undefined | null): string {
  if (s == null) return 'Not recorded';
  return s === 'none' ? 'None' : s === 'mild' ? 'Mild' : s === 'moderate' ? 'Moderate' : 'Severe';
}

export function normalizeSeverity(v: unknown): Severity | undefined {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
  if (s === 'mild' || s === 'low' || s === 'light') return 'mild';
  if (s === 'moderate' || s === 'medium' || s === 'mod') return 'moderate';
  if (s === 'severe' || s === 'high' || s === 'sev') return 'severe';
  return s === 'none' ? 'none' : undefined;
}

type FieldKey = Exclude<keyof EffectEntry, 'id' | 'date' | 'notes' | 'customEffects'>;

export interface SymptomField {
  key: FieldKey;
  label: string;
}

/** Fields the symptom form asks about. Always shown. */
export const COLLECTED_FIELDS: SymptomField[] = [
  { key: 'hunger', label: 'Hunger' },
  { key: 'foodNoise', label: 'Food noise' },
  { key: 'appetiteLoss', label: 'Appetite suppression' },
  { key: 'nausea', label: 'Nausea' },
  { key: 'fatigue', label: 'Fatigue' },
  { key: 'reflux', label: 'Reflux / heartburn' },
  { key: 'constipation', label: 'Constipation' },
  { key: 'diarrhea', label: 'Diarrhea' },
  { key: 'bloating', label: 'Bloating' },
];

/** Older or imported entries may carry these; they count only if the user actually recorded something. */
const OPTIONAL_FIELDS: SymptomField[] = [
  { key: 'cravings', label: 'Cravings' },
  { key: 'mood', label: 'Mood' },
  { key: 'energy', label: 'Energy' },
  { key: 'dehydration', label: 'Dehydration' },
  { key: 'indigestion', label: 'Indigestion' },
  { key: 'insomnia', label: 'Insomnia' },
];

/** Symptoms to analyse: the form's fields, plus optional ones that have real (non-"none") data. */
export function trackedFields(effects: EffectEntry[]): SymptomField[] {
  const extras = OPTIONAL_FIELDS.filter((f) => effects.some((e) => e[f.key] && e[f.key] !== 'none'));
  return [...COLLECTED_FIELDS, ...extras];
}

export const sevOf = (e: EffectEntry, key: FieldKey): Severity | undefined => e[key];

/** Null creates a chart gap; an unanswered field is never a zero rating. */
export const severityValue = (s: Severity | undefined): number | null => s == null ? null : SEVERITY_RANK[s];

export function sortEffects(effects: EffectEntry[]): EffectEntry[] {
  return [...effects].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/** One derived analysis row per local day, using peak recorded severity; original entries stay unchanged. */
export function dailySymptomEntries(effects: EffectEntry[]): EffectEntry[] {
  const days = new Map<string, EffectEntry>();
  const fields = trackedFields(effects);
  for (const entry of sortEffects(effects)) {
    const day = isoToLocalDateString(entry.date);
    const current = days.get(day);
    if (!current) {
      days.set(day, { ...entry, customEffects: { ...entry.customEffects } });
      continue;
    }
    for (const { key } of fields) {
      const incoming = sevOf(entry, key);
      const existing = sevOf(current, key);
      if (incoming != null && (existing == null || SEVERITY_RANK[incoming] > SEVERITY_RANK[existing])) current[key] = incoming;
    }
    for (const [name, severity] of Object.entries(entry.customEffects ?? {})) {
      const existing = current.customEffects?.[name];
      if (existing == null || SEVERITY_RANK[severity] > SEVERITY_RANK[existing]) current.customEffects![name] = severity;
    }
  }
  return [...days.values()];
}

/** Most recent symptom log, only if it is at most `maxAgeDays` calendar days old. */
export function latestEffectWithin(effects: EffectEntry[], now: Date = new Date(), maxAgeDays = 3): EffectEntry | null {
  const sorted = sortEffects(effects);
  const last = sorted[sorted.length - 1];
  if (!last) return null;
  const age = localDayDiff(last.date, now);
  return age <= maxAgeDays ? last : null;
}

export interface SymptomSummaryItem {
  key: string;
  label: string;
  daysPresent: number;
  daysRecorded: number;
  peak: Severity;
  latest: Severity | undefined;
}

export interface SymptomSummary {
  windowDays: number;
  daysLogged: number;
  items: SymptomSummaryItem[];
}

/** Symptoms the user actually logged (anything above "none") between two instants, worst first. */
export function summarizeSymptoms(effects: EffectEntry[], from: Date, to: Date): Omit<SymptomSummary, 'windowDays'> {
  const inWindow = sortEffects(effects).filter((e) => {
    const t = new Date(e.date).getTime();
    return t >= from.getTime() && t <= to.getTime();
  });
  return summarizeEntries(inWindow);
}

function summarizeEntries(inWindow: EffectEntry[]): Omit<SymptomSummary, 'windowDays'> {
  const daily = dailySymptomEntries(inWindow);
  const items: SymptomSummaryItem[] = [];
  const consider = (key: string, label: string, get: (e: EffectEntry) => Severity | undefined) => {
    let daysPresent = 0;
    let daysRecorded = 0;
    let peak: Severity = 'none';
    for (const e of daily) {
      const s = get(e);
      if (s == null) continue;
      daysRecorded++;
      if (s !== 'none') daysPresent++;
      if (SEVERITY_RANK[s] > SEVERITY_RANK[peak]) peak = s;
    }
    if (daysPresent > 0) {
      items.push({ key, label, daysPresent, daysRecorded, peak, latest: get(inWindow[inWindow.length - 1]) });
    }
  };
  for (const f of trackedFields(inWindow)) consider(f.key, f.label, (e) => sevOf(e, f.key));
  const customNames = new Set<string>();
  inWindow.forEach((e) => Object.keys(e.customEffects ?? {}).forEach((n) => customNames.add(n)));
  customNames.forEach((name) => consider(`custom:${name}`, name, (e) => e.customEffects?.[name]));

  items.sort((a, b) => SEVERITY_RANK[b.peak] - SEVERITY_RANK[a.peak] || b.daysPresent - a.daysPresent);
  return { daysLogged: daily.length, items };
}

/** Symptoms the user actually logged in the last `windowDays` calendar days, worst first. */
export function recentSymptomSummary(effects: EffectEntry[], now: Date = new Date(), windowDays = 7): SymptomSummary {
  const inWindow = sortEffects(effects).filter((e) => {
    const age = localDayDiff(e.date, now);
    return age >= 0 && age < windowDays;
  });
  return { windowDays, ...summarizeEntries(inWindow) };
}
