import type { Medication, UserSettings } from '../types';
import { WEIGHT_BOUNDS, WeightUnit, displayToLbs } from './units';
import { dateOnlyToIso, parseDateOnly, todayLocalDateString } from './dates';
import { MEDICATION_OPTIONS } from './medications';

export interface ProfileFormInput {
  medication: Medication;
  unit: WeightUnit;
  startingWeight: string;
  goalWeight: string;
  heightFt: string;
  heightIn: string;
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

  if (!MEDICATION_OPTIONS.includes(input.medication)) errors.medication = 'Choose a medication.';

  const start = parseWeight(input.startingWeight, input.unit, 'starting weight');
  if (start.error) errors.startingWeight = start.error;
  const goal = parseWeight(input.goalWeight, input.unit, 'goal weight');
  if (goal.error) errors.goalWeight = goal.error;

  const ft = Number(input.heightFt.trim());
  const inch = input.heightIn.trim() === '' ? 0 : Number(input.heightIn.trim());
  if (!input.heightFt.trim() || !Number.isInteger(ft) || ft < 3 || ft > 8) errors.heightFt = 'Height feet should be a whole number from 3 to 8.';
  if (!Number.isFinite(inch) || inch < 0 || inch >= 12) errors.heightIn = 'Height inches should be from 0 to 11.';

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
      medication: input.medication,
      startingWeight: start.lbs!,
      targetWeight: goal.lbs!,
      heightInches: ft * 12 + inch,
      startDate: dateOnlyToIso(input.startDate),
      weightUnit: input.unit,
    },
  };
}
