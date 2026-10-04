import type { DoseEvent, EffectEntry, Severity, WeightEntry } from '../types';
import { normalizeMedication } from './medications';
import { normalizeSeverity } from './symptoms';

/** Per-row validators shared by backup restore and by loading stored data, so both agree on what a valid row is. */

export type RowResult<T> = { ok: true; row: T } | { ok: false; reasons: string[] };

export const SEVERITY_FIELDS = ['hunger', 'foodNoise', 'cravings', 'mood', 'energy', 'nausea', 'fatigue', 'constipation', 'diarrhea', 'reflux', 'appetiteLoss', 'bloating', 'dehydration', 'indigestion', 'insomnia'] as const;

export const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export const isIso = (v: unknown): v is string => typeof v === 'string' && v.length >= 8 && !Number.isNaN(new Date(v).getTime());
const idOk = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

export function checkDose(r: unknown): RowResult<DoseEvent> {
  if (!isObj(r)) return { ok: false, reasons: ['not an object.'] };
  const reasons: string[] = [];
  if (!idOk(r.id)) reasons.push('missing id.');
  if (!isIso(r.date)) reasons.push('“date” isn’t a valid date.');
  if (typeof r.amountMg !== 'number' || !Number.isFinite(r.amountMg) || r.amountMg <= 0 || r.amountMg > 1000) reasons.push('“amountMg” must be a positive number.');
  const pain = r.painLevel == null ? 0 : r.painLevel;
  if (typeof pain !== 'number' || !Number.isFinite(pain) || pain < 0 || pain > 10) reasons.push('“painLevel” must be 0 to 10.');
  if (reasons.length) return { ok: false, reasons };
  return {
    ok: true,
    row: {
      id: r.id as string,
      medication: normalizeMedication(r.medication),
      amountMg: r.amountMg as number,
      date: r.date as string,
      site: typeof r.site === 'string' ? r.site : '',
      painLevel: pain as number,
      notes: typeof r.notes === 'string' ? r.notes : '',
    },
  };
}

export function checkWeight(r: unknown): RowResult<WeightEntry> {
  if (!isObj(r)) return { ok: false, reasons: ['not an object.'] };
  const reasons: string[] = [];
  if (!idOk(r.id)) reasons.push('missing id.');
  if (!isIso(r.date)) reasons.push('“date” isn’t a valid date.');
  if (typeof r.weightLbs !== 'number' || !Number.isFinite(r.weightLbs) || r.weightLbs <= 0 || r.weightLbs > 1500) reasons.push('“weightLbs” must be a number between 0 and 1500.');
  if (reasons.length) return { ok: false, reasons };
  return { ok: true, row: { id: r.id as string, date: r.date as string, weightLbs: r.weightLbs as number } };
}

export function checkEffect(r: unknown): RowResult<EffectEntry> {
  if (!isObj(r)) return { ok: false, reasons: ['not an object.'] };
  const reasons: string[] = [];
  if (!idOk(r.id)) reasons.push('missing id.');
  if (!isIso(r.date)) reasons.push('“date” isn’t a valid date.');
  if (reasons.length) return { ok: false, reasons };
  const entry = { id: r.id as string, date: r.date as string, notes: typeof r.notes === 'string' ? r.notes : '' } as EffectEntry;
  for (const k of SEVERITY_FIELDS) (entry as unknown as Record<string, Severity>)[k] = normalizeSeverity(r[k]);
  if (isObj(r.customEffects)) {
    entry.customEffects = Object.fromEntries(Object.entries(r.customEffects).map(([name, v]) => [name, normalizeSeverity(v)]));
  }
  return { ok: true, row: entry };
}
