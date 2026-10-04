import type { Medication } from '../types';

/**
 * Reference data for the medications the app understands.
 *
 * IMPORTANT: every number and sentence here is approximate and was written conservatively.
 * Verify against the current prescribing information before relying on it, and see
 * "Needs human review" in the README. None of it is used to tell anyone what dose to take.
 */
export interface MedicationInfo {
  name: Medication;
  /** Approximate elimination half-life in days (approximate; verify against current prescribing information). */
  halfLifeDays: number | null;
  /** Standard dose steps in mg (approximate; verify against current prescribing information). Empty when none apply. */
  doseSteps: readonly number[];
  /** Highest standard dose in mg, or null when no standard maximum applies. */
  maxStandardMg: number | null;
  /** Not an approved medicine: no approved doses, schedule or missed-dose guidance exist. */
  investigational: boolean;
  /** Days between scheduled doses; null when unknown. */
  intervalDays: number | null;
  /** Label-style missed-dose note (approximate; verify against current prescribing information). */
  missedDoseNote: string;
  /** Short note about what the app can and cannot say for this medication. */
  notes?: string;
}

export const MEDICATION_INFO: Record<Medication, MedicationInfo> = {
  Tirzepatide: {
    name: 'Tirzepatide',
    halfLifeDays: 5,
    doseSteps: [2.5, 5, 7.5, 10, 12.5, 15],
    maxStandardMg: 15,
    investigational: false,
    intervalDays: 7,
    missedDoseNote:
      'Prescribing information for tirzepatide products generally says a missed weekly dose can be taken within about 4 days (96 hours) of when it was due. After that, skip it and take the next dose on your usual day. Never take two doses to catch up. Confirm with your prescriber or pharmacist.',
  },
  Semaglutide: {
    name: 'Semaglutide',
    halfLifeDays: 7,
    doseSteps: [0.25, 0.5, 1, 1.7, 2, 2.4],
    maxStandardMg: 2.4,
    investigational: false,
    intervalDays: 7,
    missedDoseNote:
      'Prescribing information for once-weekly semaglutide products generally says a missed dose can be taken within about 5 days of when it was due. After that, skip it and take the next dose on your usual day. Never take two doses to catch up. Confirm with your prescriber or pharmacist.',
    notes: 'Different semaglutide products use different dose ladders, so your own prescription is the authority.',
  },
  Retatrutide: {
    name: 'Retatrutide',
    halfLifeDays: 6,
    doseSteps: [],
    maxStandardMg: null,
    investigational: true,
    intervalDays: 7,
    missedDoseNote:
      'Retatrutide is investigational, so there is no approved missed-dose guidance. Follow the instructions from your study team or prescriber, and never take two doses to catch up.',
    notes: 'Investigational: not approved, with no approved doses. This app cannot tell you whether a dose is appropriate.',
  },
  Other: {
    name: 'Other',
    halfLifeDays: null,
    doseSteps: [],
    maxStandardMg: null,
    investigational: false,
    intervalDays: null,
    missedDoseNote: 'Follow the missed-dose instructions that came with your medication or ask your prescriber or pharmacist. Never take two doses to catch up.',
    notes: 'The app has no pharmacology data for this medication, so it will not estimate levels or a schedule.',
  },
};

/** The medications the app tracks. Single source of truth for every dropdown. */
export const MEDICATION_OPTIONS: readonly Medication[] = ['Tirzepatide', 'Semaglutide', 'Retatrutide', 'Other'];

export function medicationInfo(medication: Medication): MedicationInfo {
  return MEDICATION_INFO[medication] ?? MEDICATION_INFO.Other;
}

/**
 * Map a brand or free-text name onto the tracked generic.
 * Unknown / missing values fall back to 'Other' (never silently to a specific drug).
 */
export function normalizeMedication(value: unknown): Medication {
  if (typeof value !== 'string') return 'Other';
  const v = value.trim().toLowerCase();
  if (v === 'tirzepatide' || v === 'mounjaro' || v === 'zepbound') return 'Tirzepatide';
  if (v === 'semaglutide' || v === 'ozempic' || v === 'wegovy' || v === 'rybelsus') return 'Semaglutide';
  if (v === 'retatrutide') return 'Retatrutide';
  return 'Other';
}

/** Days between scheduled doses. All tracked drugs are once-weekly; unknown for "Other". */
export function dosingIntervalDays(medication: Medication): number | null {
  return medicationInfo(medication).intervalDays;
}

export interface DoseWarning {
  level: 'error' | 'caution' | 'info';
  text: string;
  /** The user must tick "I've double-checked" before saving. */
  requiresConfirmation: boolean;
}

/** A warning about a dose amount, or null when it is a standard step. Never says what dose to take. */
export function doseWarning(medication: Medication, amountMg: number): DoseWarning | null {
  const info = medicationInfo(medication);
  if (!Number.isFinite(amountMg) || amountMg <= 0) {
    return { level: 'error', text: 'Enter a dose greater than 0 mg.', requiresConfirmation: false };
  }
  if (info.investigational) {
    return {
      level: 'caution',
      text: `${info.name} is investigational. There are no approved doses, so this app cannot check the amount. Use only what your study team or prescriber instructed.`,
      requiresConfirmation: false,
    };
  }
  if (info.maxStandardMg != null && amountMg > info.maxStandardMg) {
    return {
      level: 'caution',
      text: `${amountMg} mg is above the usual maximum of ${info.maxStandardMg} mg for ${info.name}. Check your prescription, and make sure this is mg and not another unit.`,
      requiresConfirmation: true,
    };
  }
  if (info.doseSteps.length > 0 && !info.doseSteps.some((s) => Math.abs(s - amountMg) < 1e-9)) {
    return {
      level: 'info',
      text: `${amountMg} mg isn't one of the usual ${info.name} steps (${info.doseSteps.join(', ')} mg). That's fine if it matches your prescription.`,
      requiresConfirmation: false,
    };
  }
  return null;
}

/** Starting amount for the dose form: the user's last dose of that drug, else the first standard step, else blank. */
export function defaultDoseAmount(medication: Medication, history: Array<{ medication: Medication; amountMg: number; date: string }>): number | null {
  const mine = history.filter((d) => d.medication === medication).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  if (mine.length) return mine[0].amountMg;
  return medicationInfo(medication).doseSteps[0] ?? null;
}
