import type { Medication, UserSettings } from '../types';
import { WEIGHT_BOUNDS, WeightUnit, displayToLbs } from './units';
import { dateOnlyToIso, isoToLocalDateString, parseDateOnly, todayLocalDateString } from './dates';
import { MEDICATION_OPTIONS } from './medications';

export interface ProfileFormInput {
  medication: Medication | '';
  unit: WeightUnit;
  startingWeight: string;
  goalWeight: string;
  heightFt: string;
  heightIn: string;
  /** When present with kg selected, centimetres are the input; stored height remains inches. */
  heightCm?: string;
  startDate: string; // YYYY-MM-DD (local)
}

export type ProfileField = keyof ProfileFormInput;

export const MIN_START_DATE = '2000-01-01';

export interface ProfileValidation {
  errors: Partial<Record<ProfileField, string>>;
  value?: UserSettings;
}

function parseWeight(raw: string, unit: WeightUnit, label: string): { lbs?: number; error?: string } {
  const text = raw.trim();
  if (!text) return { error: `Enter your ${label}.` };
  const n = Number(text);
  const { min, max } = WEIGHT_BOUNDS[unit];
  if (!Number.isFinite(n)) return { error: `${label[0].toUpperCase()}${label.slice(1)} must be a number.` };
  if (n < min || n > max) return { error: `${label[0].toUpperCase()}${label.slice(1)} should be between ${min} and ${max} ${unit}.` };
  return { lbs: displayToLbs(n, unit) };
}

/** Validate the profile form and, if valid, produce settings with weights converted to pounds. */
export function validateProfile(input: ProfileFormInput, today: string = todayLocalDateString()): ProfileValidation {
  const errors: ProfileValidation['errors'] = {};

  const medication = MEDICATION_OPTIONS.find(m => m === input.medication);
  if (!medication) errors.medication = 'Choose a medication.';

  const start = parseWeight(input.startingWeight, input.unit, 'starting weight');
  if (start.error) errors.startingWeight = start.error;
  const goal = parseWeight(input.goalWeight, input.unit, 'goal weight');
  if (goal.error) errors.goalWeight = goal.error;
  if (start.lbs != null && goal.lbs != null && goal.lbs >= start.lbs) errors.goalWeight = 'For this weight-loss tracker, enter a goal below your starting weight. Agree your goal with your clinician.';

  const ft = Number(input.heightFt.trim());
  const inch = input.heightIn.trim() === '' ? 0 : Number(input.heightIn.trim());
  let heightInches = ft * 12 + inch;
  if (input.unit === 'kg' && input.heightCm !== undefined) {
    const cm = Number(input.heightCm.trim());
    heightInches = cm / 2.54;
    if (!input.heightCm.trim() || !Number.isFinite(cm) || heightInches < 36 || heightInches >= 108) errors.heightCm = 'Enter a height from 91.44 to below 274.32 cm.';
  } else {
    if (!input.heightFt.trim() || !Number.isInteger(ft) || ft < 3 || ft > 8) errors.heightFt = 'Height feet should be a whole number from 3 to 8.';
    if (!Number.isFinite(inch) || inch < 0 || inch >= 12) errors.heightIn = 'Height inches should be from 0 to 11.';
  }

  if (!parseDateOnly(input.startDate)) {
    errors.startDate = 'Enter a valid start date.';
  } else if (input.startDate > today) {
    errors.startDate = 'Start date cannot be in the future.';
  } else if (input.startDate < MIN_START_DATE) {
    errors.startDate = `Start date should be on or after ${MIN_START_DATE}.`;
  }

  if (Object.keys(errors).length > 0) return { errors };

  return {
    errors,
    value: {
      medication: medication!,
      startingWeight: start.lbs!,
      targetWeight: goal.lbs!,
      heightInches,
      startDate: dateOnlyToIso(input.startDate),
      weightUnit: input.unit,
    },
  };
}

/** Pre-fill values for "welcome back" onboarding, taken from the user's earliest real entries. */
export function earliestEntryDefaults(args: {
  weights: Array<{ date: string; weightLbs: number }>;
  doses: Array<{ date: string }>;
  effects: Array<{ date: string }>;
}): { startDate: string | null; startingWeightLbs: number | null } {
  const byDate = <T extends { date: string }>(rows: T[]) => [...rows].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const w = byDate(args.weights)[0];
  const d = byDate(args.doses)[0];
  const e = byDate(args.effects)[0];
  const candidates = [w, d].filter(Boolean) as Array<{ date: string }>;
  const pool = candidates.length > 0 ? candidates : ([e].filter(Boolean) as Array<{ date: string }>);
  const earliest = byDate(pool)[0];
  return { startDate: earliest ? isoToLocalDateString(earliest.date) : null, startingWeightLbs: w ? w.weightLbs : null };
}
