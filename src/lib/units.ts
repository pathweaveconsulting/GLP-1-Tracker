import type { UserSettings } from '../types';

/**
 * Canonical storage unit for every weight in the app is POUNDS.
 * Convert only at the edges (inputs and display) with these helpers.
 */
export type WeightUnit = 'lbs' | 'kg';

export const LBS_PER_KG = 2.2046226218;

/** Plausible human body-weight bounds per unit, used to catch typos (not medical limits). */
export const WEIGHT_BOUNDS: Record<WeightUnit, { min: number; max: number }> = {
  lbs: { min: 50, max: 800 },
  kg: { min: 23, max: 362 },
};

export function getWeightUnit(settings?: Pick<UserSettings, 'weightUnit'> | null): WeightUnit {
  return settings?.weightUnit === 'kg' ? 'kg' : 'lbs';
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function lbsToDisplay(lbs: number, unit: WeightUnit): number {
  return unit === 'kg' ? round1(lbs / LBS_PER_KG) : round1(lbs);
}

/** Convert a typed value in `unit` into the canonical pounds (full precision). */
export function displayToLbs(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value * LBS_PER_KG : value;
}

export function lbsToKg(lbs: number): number {
  return lbs / LBS_PER_KG;
}

export function formatWeight(lbs: number | null | undefined, unit: WeightUnit, opts: { unit?: boolean; digits?: number } = {}): string {
  if (lbs == null || !Number.isFinite(lbs)) return '–';
  const digits = opts.digits ?? 1;
  const v = (unit === 'kg' ? lbs / LBS_PER_KG : lbs).toFixed(digits);
  return opts.unit === false ? v : `${v} ${unit}`;
}

/** Signed change, e.g. "-2.4 lbs" / "+0.6 kg" ("0.0 lbs" when flat). */
export function formatWeightChange(deltaLbs: number | null | undefined, unit: WeightUnit, opts: { unit?: boolean; digits?: number } = {}): string {
  if (deltaLbs == null || !Number.isFinite(deltaLbs)) return '–';
  const digits = opts.digits ?? 1;
  const v = unit === 'kg' ? deltaLbs / LBS_PER_KG : deltaLbs;
  const s = v.toFixed(digits);
  const num = Number(s) === 0 ? Number(s).toFixed(digits) : Number(s) > 0 ? `+${s}` : s;
  return opts.unit === false ? num : `${num} ${unit}`;
}

export function formatHeight(heightInches: number | null | undefined): string {
  if (!heightInches || !Number.isFinite(heightInches) || heightInches <= 0) return '–';
  const total = Math.round(heightInches);
  return `${Math.floor(total / 12)}'${total % 12}"`;
}

/** BMI from pounds and inches. Returns null instead of Infinity/NaN when inputs are unusable. */
export function bmi(weightLbs: number | null | undefined, heightInches: number | null | undefined): number | null {
  if (!weightLbs || !heightInches || weightLbs <= 0 || heightInches <= 0) return null;
  const v = (703 * weightLbs) / (heightInches * heightInches);
  return Number.isFinite(v) ? v : null;
}

/** General adult BMI categories (WHO cut-offs). BMI is a population screen, not a diagnosis. */
export function bmiCategory(value: number | null): string | null {
  if (value == null) return null;
  if (value < 18.5) return 'Below healthy range';
  if (value < 25) return 'Healthy range';
  if (value < 30) return 'Overweight range';
  return 'Obesity range';
}
