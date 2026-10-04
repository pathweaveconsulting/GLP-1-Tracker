import type { UserSettings } from '../types';
import { normalizeMedication } from '../lib/medications';
import { checkDose, checkEffect, checkWeight, isIso, isObj, RowResult } from '../lib/rowValidation';

export interface SanitizeResult {
  state: Record<string, unknown> | null;
  /** Rows that failed validation and were skipped. */
  dropped: number;
  /** The stored shape itself was wrong (not an object, a table that is not a list, bad settings…). */
  malformed: boolean;
}

const finiteNonNeg = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);

function sanitizeSettings(v: unknown): { settings: UserSettings | undefined; malformed: boolean } {
  if (v === undefined) return { settings: undefined, malformed: false };
  if (!isObj(v)) return { settings: undefined, malformed: true };
  return {
    malformed: false,
    settings: {
      medication: normalizeMedication(v.medication),
      startingWeight: finiteNonNeg(v.startingWeight),
      targetWeight: finiteNonNeg(v.targetWeight),
      heightInches: finiteNonNeg(v.heightInches),
      startDate: isIso(v.startDate) ? v.startDate : new Date().toISOString(),
      weightUnit: v.weightUnit === 'kg' ? 'kg' : 'lbs',
      customSites: Array.isArray(v.customSites) ? v.customSites.filter((x): x is string => typeof x === 'string') : undefined,
      customEffectNames: Array.isArray(v.customEffectNames) ? v.customEffectNames.filter((x): x is string => typeof x === 'string') : undefined,
    },
  };
}

/**
 * Validate the `state` part of a persisted blob (any version): drop unreadable rows, normalise
 * medications and severities, and repair malformed tables. Never throws.
 *
 * Old-build rows keep their ids here so the version-0 migration can still recognise and strip demo rows.
 */
export function sanitizePersistedState(input: unknown): SanitizeResult {
  if (!isObj(input)) return { state: null, dropped: 0, malformed: true };
  let dropped = 0;
  let malformed = false;
  const out: Record<string, unknown> = { ...input };

  const table = <T,>(key: 'doses' | 'weights' | 'effects', check: (r: unknown) => RowResult<T>) => {
    const v = input[key];
    if (v === undefined) return;
    if (!Array.isArray(v)) { malformed = true; out[key] = []; return; }
    out[key] = v.flatMap((r) => {
      const res = check(r);
      if (res.ok) return [res.row];
      dropped++;
      return [];
    });
  };
  table('doses', checkDose);
  table('weights', checkWeight);
  table('effects', checkEffect);

  const s = sanitizeSettings(input.settings);
  if (s.malformed) { malformed = true; delete out.settings; }
  else if (s.settings) out.settings = s.settings;

  if (input.hasOnboarded !== undefined && typeof input.hasOnboarded !== 'boolean') { malformed = true; out.hasOnboarded = false; }
  return { state: out, dropped, malformed };
}
