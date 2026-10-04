import type { DoseEvent, EffectEntry, PersistedData, UserSettings, WeightEntry } from '../types';
import { normalizeMedication } from '../lib/medications';

export const STORE_VERSION = 1;

/**
 * Ids produced by the old demo-data generator (`dose-3`, `weight-12`, `effect-0`).
 * Real entries are created with UUIDs, so this pattern never matches user data.
 */
export const DEMO_ID_PATTERN = /^(dose|weight|effect)-\d+$/;

export function emptySettings(todayIso: string = new Date().toISOString()): UserSettings {
  return {
    medication: 'Tirzepatide',
    startingWeight: 0,
    targetWeight: 0,
    heightInches: 0,
    startDate: todayIso,
    weightUnit: 'lbs',
  };
}

export function emptyData(): PersistedData {
  return { doses: [], weights: [], effects: [], settings: emptySettings(), hasOnboarded: false };
}

const asArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const isRow = (v: unknown): v is { id: string } => !!v && typeof v === 'object' && typeof (v as { id?: unknown }).id === 'string';

/**
 * Upgrade state persisted by an older build.
 *
 * From the unversioned build (version 0) this removes the generated demo rows, maps brand names
 * to generics and defaults the display unit. `hasOnboarded` is only true when real data survives;
 * otherwise the user is sent through onboarding with a blank profile (the old profile was demo data too).
 */
export function migrateStore(persisted: unknown, fromVersion: number): PersistedData {
  const raw = (persisted && typeof persisted === 'object' ? persisted : {}) as Partial<PersistedData> & Record<string, unknown>;
  if (fromVersion >= STORE_VERSION) {
    return { ...emptyData(), ...raw } as PersistedData;
  }

  const keep = <T extends { id: string }>(rows: unknown): T[] =>
    asArray<unknown>(rows).filter(isRow).filter((r) => !DEMO_ID_PATTERN.test(r.id)) as unknown as T[];

  const doses = keep<DoseEvent>(raw.doses).map((d) => ({ ...d, medication: normalizeMedication(d.medication) }));
  const weights = keep<WeightEntry>(raw.weights);
  const effects = keep<EffectEntry>(raw.effects);
  const hasRealData = doses.length + weights.length + effects.length > 0;

  const base = emptySettings();
  const oldSettings = (raw.settings && typeof raw.settings === 'object' ? raw.settings : {}) as Partial<UserSettings>;
  const settings: UserSettings = hasRealData
    ? {
        ...base,
        ...oldSettings,
        medication: normalizeMedication(oldSettings.medication),
        weightUnit: oldSettings.weightUnit === 'kg' ? 'kg' : 'lbs',
      }
    : base;

  return { doses, weights, effects, settings, hasOnboarded: hasRealData };
}
