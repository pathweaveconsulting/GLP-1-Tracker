import type { Medication } from '../types';

/** The medications the app tracks. Single source of truth for every dropdown. */
export const MEDICATION_OPTIONS: readonly Medication[] = ['Tirzepatide', 'Semaglutide', 'Retatrutide', 'Other'];

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
  return medication === 'Other' ? null : 7;
}
