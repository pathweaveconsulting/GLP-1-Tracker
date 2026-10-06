import type { DoseEvent, EffectEntry, UserSettings, WeightEntry } from '../types';
import { normalizeMedication } from './medications';
import { checkDose, checkEffect, checkWeight, isIso, isObj, RowResult } from './rowValidation';

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

const MAX_ERRORS = 10;

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

  const rows = <T,>(key: 'doses' | 'weights' | 'effects', kind: string, check: (r: unknown) => RowResult<T>): T[] => {
    const checkId = seen(kind);
    return arr(key).flatMap((r, i): T[] => {
      const n = i + 1;
      if (isObj(r) && typeof r.id === 'string' && r.id) checkId(r.id, n);
      const res = check(r);
      if (!res.ok) { res.reasons.forEach((m) => err(`${kind} #${n}: ${m}`)); return []; }
      return [res.row];
    });
  };
  const doses: DoseEvent[] = rows('doses', 'Dose', checkDose);
  const weights: WeightEntry[] = rows('weights', 'Weight', checkWeight);
  const effects: EffectEntry[] = rows('effects', 'Symptom log', checkEffect);

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

