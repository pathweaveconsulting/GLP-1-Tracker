import type { Medication } from '../types';

/**
 * Reference data for the medications the app understands.
 *
 * IMPORTANT: every number and sentence here is approximate and was written conservatively.
 * Verify against the current prescribing information before relying on it, and see
 * "Needs human review" in the README. None of it is used to tell anyone what dose to take.
 */
/** Repeated wherever a number from this file is shown to the user. */
export const APPROXIMATE_NOTE = 'approximate; verify against current prescribing information';
/** Shown wherever a missed-dose window appears. */
export const LEAFLET_LINE = 'Check your leaflet or ask your pharmacist.';

/** Wording for products with a weekly schedule: no day counts and no permission to dose late or twice. */
export const MISSED_DOSE_NOTE =
  'Missed-dose instructions depend on your exact product. Check your leaflet or ask your pharmacist. This app does not tell you to take a late or extra dose.';
/** Shown instead of a level curve, phase or due date when a medication is not modelled. */
export const NO_ESTIMATE_TEXT = 'No estimate available for this medication.';

export interface MedicationInfo {
  name: Medication;
  /** Approximate elimination half-life in days (approximate; verify against current prescribing information). */
  halfLifeDays: number | null;
  /** Standard dose steps in mg (approximate; verify against current prescribing information). Empty when none apply. */
  doseSteps: readonly number[];
  /** Highest standard dose in mg, or null when no standard maximum applies. */
  maxStandardMg: number | null;
  /**
   * True only when the app has a half-life and a dosing interval it is willing to model. When false the app shows no
   * level curve, percent of peak, phase text or due date for this medication ("No estimate available").
   */
  modelled: boolean;
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
    modelled: true,
    investigational: false,
    intervalDays: 7,
    missedDoseNote:
      MISSED_DOSE_NOTE,
  },
  Semaglutide: {
    name: 'Semaglutide',
    halfLifeDays: 7,
    doseSteps: [0.25, 0.5, 1, 1.7, 2, 2.4],
    maxStandardMg: null,
    modelled: true,
    investigational: false,
    intervalDays: 7,
    missedDoseNote:
      MISSED_DOSE_NOTE,
    notes: 'Weekly injections only. Semaglutide products have different strengths and maximums; the buttons are an incomplete reference, not a dose ladder. Verify your exact product and prescription. For oral semaglutide, including Wegovy tablets and Rybelsus, select Other.',
  },
  Retatrutide: {
    name: 'Retatrutide',
    // Investigational: there is no established half-life or schedule to model, so none is invented here.
    halfLifeDays: null,
    doseSteps: [],
    maxStandardMg: null,
    modelled: false,
    investigational: true,
    intervalDays: null,
    missedDoseNote:
      'Retatrutide is investigational, so there is no approved missed-dose guidance. Follow the instructions from your study team or prescriber, and never take two doses to catch up.',
    notes: 'Investigational: not approved, with no approved doses. This app cannot tell you whether a dose is appropriate.',
  },
  Other: {
    name: 'Other',
    halfLifeDays: null,
    doseSteps: [],
    maxStandardMg: null,
    modelled: false,
    investigational: false,
    intervalDays: null,
    missedDoseNote: 'Follow the missed-dose instructions that came with your medication or ask your prescriber or pharmacist. Never take two doses to catch up.',
    notes: 'The app has no pharmacology data for this medication, so it will not estimate levels or a schedule.',
  },
};

/** Shown wherever "Other" (including oral tablets such as Rybelsus) is selected or loaded. */
export const OTHER_MEDICATION_NOTE =
  'Dose guidance and the level curve aren’t available for this medication. This includes daily oral tablets such as Rybelsus and Wegovy tablets, which the weekly model doesn’t describe. Your logs, weight and symptom pages still work.';

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
  if (v === 'semaglutide' || v === 'ozempic' || v === 'wegovy') return 'Semaglutide';
  // Oral semaglutide (Rybelsus) is a daily tablet, so the weekly model, dose steps and maximum below do not apply to it.
  // approximate; verify against current prescribing information
  if (v === 'rybelsus' || v === 'wegovy tablets' || v === 'oral semaglutide') return 'Other';
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
      text: `${amountMg} mg is above the usual maximum of ${info.maxStandardMg} mg for ${info.name}. Check your prescription, and make sure this is mg and not another unit. (${APPROXIMATE_NOTE})`,
      requiresConfirmation: true,
    };
  }
  if (info.doseSteps.length > 0 && !info.doseSteps.some((s) => Math.abs(s - amountMg) < 1e-9)) {
    return {
      level: 'info',
      text: `${amountMg} mg isn't one of the usual ${info.name} steps (${info.doseSteps.join(', ')} mg). This app cannot check whether that amount is appropriate. Verify your exact product, prescription and units with your pharmacist. (Steps are ${APPROXIMATE_NOTE}.)`,
      // A higher strength can be product-specific; keep the units check without inventing a shared maximum.
      requiresConfirmation: info.maxStandardMg == null && amountMg > Math.max(...info.doseSteps),
    };
  }
  return null;
}

/**
 * Starting amount for the dose form: the user's own last dose of that drug, otherwise nothing.
 * It never falls back to a reference strength, so a first-ever dose must be typed (or picked) deliberately.
 */
export function defaultDoseAmount(medication: Medication, history: Array<{ medication: Medication; amountMg: number; date: string }>): number | null {
  const mine = history.filter((d) => d.medication === medication).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return mine.length ? mine[0].amountMg : null;
}
