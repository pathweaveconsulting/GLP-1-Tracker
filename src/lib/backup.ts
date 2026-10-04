import type { DoseEvent, EffectEntry, Severity, UserSettings, WeightEntry } from '../types';
import { normalizeMedication } from './medications';
import { normalizeSeverity } from './symptoms';

export const BACKUP_FORMAT = 'glp1-tracker-backup';
export const BACKUP_VERSION = 1;

export interface BackupData {
  settings: UserSettings;
  doses: DoseEvent[];
  weights: WeightEntry[];
  effects: EffectEntry[];
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  data: BackupData;
}

export function createBackup(data: BackupData, now: Date = new Date()): BackupFile {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.toISOString(), data };
}

export type ParseBackupResult = { ok: true; data: BackupData; counts: { doses: number; weights: number; effects: number } } | { ok: false; errors: string[] };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isIso = (v: unknown): v is string => typeof v === 'string' && v.length >= 8 && !Number.isNaN(new Date(v).getTime());
const MAX_ERRORS = 10;

const SEVERITY_FIELDS = ['hunger', 'foodNoise', 'cravings', 'mood', 'energy', 'nausea', 'fatigue', 'constipation', 'diarrhea', 'reflux', 'appetiteLoss', 'bloating', 'dehydration', 'indigestion', 'insomnia'] as const;

/** Strictly validate and normalise a backup file. Any invalid row rejects the whole restore, with readable reasons. */
export function parseBackup(text: string): ParseBackupResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['This file isn’t valid JSON, so it can’t be a GLP-1 Tracker backup.'] };
  }
  if (!isObj(raw) || raw.format !== BACKUP_FORMAT) {
    return { ok: false, errors: ['This doesn’t look like a GLP-1 Tracker backup (missing format tag).'] };
  }
  if (typeof raw.version !== 'number' || !Number.isInteger(raw.version) || raw.version < 1) {
    return { ok: false, errors: ['The backup has no valid version number.'] };
  }
  if (raw.version > BACKUP_VERSION) {
    return { ok: false, errors: [`This backup was made by a newer version of the app (backup version ${raw.version}; this app understands up to ${BACKUP_VERSION}). Update the app and try again.`] };
  }
  if (!isObj(raw.data)) return { ok: false, errors: ['The backup has no data section.'] };

  const errors: string[] = [];
  const err = (m: string) => { if (errors.length < MAX_ERRORS) errors.push(m); else if (errors.length === MAX_ERRORS) errors.push('…and more problems.'); };
  const d = raw.data;

  const arr = (key: 'doses' | 'weights' | 'effects'): unknown[] => {
    const v = d[key];
    if (v == null) return [];
    if (!Array.isArray(v)) { err(`“${key}” should be a list.`); return []; }
    return v;
  };

  const seen = (kind: string) => {
    const ids = new Set<string>();
    return (id: string, n: number) => { if (ids.has(id)) err(`${kind} #${n}: duplicate id “${id}”.`); ids.add(id); };
  };

  const checkDoseId = seen('Dose');
  const doses: DoseEvent[] = arr('doses').flatMap((r, i): DoseEvent[] => {
    const n = i + 1;
    if (!isObj(r)) { err(`Dose #${n}: not an object.`); return []; }
    const before = errors.length;
    if (typeof r.id !== 'string' || !r.id) err(`Dose #${n}: missing id.`); else checkDoseId(r.id, n);
    if (!isIso(r.date)) err(`Dose #${n}: “date” isn’t a valid date.`);
    if (typeof r.amountMg !== 'number' || !Number.isFinite(r.amountMg) || r.amountMg <= 0 || r.amountMg > 1000) err(`Dose #${n}: “amountMg” must be a positive number.`);
    const pain = r.painLevel == null ? 0 : r.painLevel;
    if (typeof pain !== 'number' || !Number.isFinite(pain) || pain < 0 || pain > 10) err(`Dose #${n}: “painLevel” must be 0 to 10.`);
    if (errors.length > before) return [];
    return [{
      id: r.id as string,
      medication: normalizeMedication(r.medication),
      amountMg: r.amountMg as number,
      date: r.date as string,
      site: typeof r.site === 'string' ? r.site : '',
      painLevel: pain as number,
      notes: typeof r.notes === 'string' ? r.notes : '',
    }];
  });

  const checkWeightId = seen('Weight');
  const weights: WeightEntry[] = arr('weights').flatMap((r, i): WeightEntry[] => {
    const n = i + 1;
    if (!isObj(r)) { err(`Weight #${n}: not an object.`); return []; }
    const before = errors.length;
    if (typeof r.id !== 'string' || !r.id) err(`Weight #${n}: missing id.`); else checkWeightId(r.id, n);
    if (!isIso(r.date)) err(`Weight #${n}: “date” isn’t a valid date.`);
    if (typeof r.weightLbs !== 'number' || !Number.isFinite(r.weightLbs) || r.weightLbs <= 0 || r.weightLbs > 1500) err(`Weight #${n}: “weightLbs” must be a number between 0 and 1500.`);
    if (errors.length > before) return [];
    return [{ id: r.id as string, date: r.date as string, weightLbs: r.weightLbs as number }];
  });

  const checkEffectId = seen('Symptom log');
  const effects: EffectEntry[] = arr('effects').flatMap((r, i): EffectEntry[] => {
    const n = i + 1;
    if (!isObj(r)) { err(`Symptom log #${n}: not an object.`); return []; }
    const before = errors.length;
    if (typeof r.id !== 'string' || !r.id) err(`Symptom log #${n}: missing id.`); else checkEffectId(r.id, n);
    if (!isIso(r.date)) err(`Symptom log #${n}: “date” isn’t a valid date.`);
    if (errors.length > before) return [];
    const entry = { id: r.id as string, date: r.date as string, notes: typeof r.notes === 'string' ? r.notes : '' } as EffectEntry;
    for (const k of SEVERITY_FIELDS) (entry as unknown as Record<string, Severity>)[k] = normalizeSeverity(r[k]);
    if (isObj(r.customEffects)) {
      entry.customEffects = Object.fromEntries(Object.entries(r.customEffects).map(([name, v]) => [name, normalizeSeverity(v)]));
    }
    return [entry];
  });

  let settings: UserSettings | null = null;
  if (!isObj(d.settings)) {
    err('The backup has no profile settings.');
  } else {
    const s = d.settings;
    const num = (k: string) => (typeof s[k] === 'number' && Number.isFinite(s[k] as number) && (s[k] as number) >= 0 ? (s[k] as number) : null);
    const startingWeight = num('startingWeight');
    const targetWeight = num('targetWeight');
    const heightInches = num('heightInches');
    if (startingWeight == null) err('Settings: “startingWeight” must be a number (pounds).');
    if (targetWeight == null) err('Settings: “targetWeight” must be a number (pounds).');
    if (heightInches == null) err('Settings: “heightInches” must be a number.');
    if (!isIso(s.startDate)) err('Settings: “startDate” isn’t a valid date.');
    if (startingWeight != null && targetWeight != null && heightInches != null && isIso(s.startDate)) {
      settings = {
        medication: normalizeMedication(s.medication),
        startingWeight,
        targetWeight,
        heightInches,
        startDate: s.startDate,
        weightUnit: s.weightUnit === 'kg' ? 'kg' : 'lbs',
        customSites: Array.isArray(s.customSites) ? s.customSites.filter((x): x is string => typeof x === 'string') : undefined,
        customEffectNames: Array.isArray(s.customEffectNames) ? s.customEffectNames.filter((x): x is string => typeof x === 'string') : undefined,
      };
    }
  }

  if (errors.length > 0 || !settings) return { ok: false, errors: errors.length ? errors : ['The backup could not be read.'] };
  return { ok: true, data: { settings, doses, weights, effects }, counts: { doses: doses.length, weights: weights.length, effects: effects.length } };
}

