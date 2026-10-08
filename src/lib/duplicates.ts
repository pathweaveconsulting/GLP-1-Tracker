import type { DoseEvent, WeightEntry } from '../types';
import { isoToLocalDateString } from './dates';

/**
 * Possible-duplicate checks for manual entries (backlog Pack 3.4). They only ever warn: a second injection or a
 * second weigh-in on the same day can be real, so the user decides. Thresholds are deliberately narrow to avoid
 * nagging; they catch a double tap or a record logged twice, not every nearby entry.
 */

/** Same medication and amount recorded within this many hours of each other. */
export const DOSE_WINDOW_HOURS = 12;
/** Same local day and within this many pounds (about 0.2 kg). */
export const WEIGHT_TOLERANCE_LBS = 0.5;

const HOUR = 3_600_000;

/** The closest existing dose that looks like the same injection, or undefined. `excludeId` skips the record being edited. */
export function similarDose(doses: DoseEvent[], candidate: Omit<DoseEvent, 'id'>, excludeId?: string): DoseEvent | undefined {
  const t = new Date(candidate.date).getTime();
  if (!Number.isFinite(t)) return undefined;
  let best: DoseEvent | undefined;
  let bestGap = Infinity;
  for (const d of doses) {
    if (d.id === excludeId || d.medication !== candidate.medication) continue;
    if (Math.abs(d.amountMg - candidate.amountMg) > 1e-9) continue;
    const gap = Math.abs(new Date(d.date).getTime() - t);
    if (gap <= DOSE_WINDOW_HOURS * HOUR && gap < bestGap) { best = d; bestGap = gap; }
  }
  return best;
}

/** An existing weigh-in on the same local day with a nearly identical value, or undefined. */
export function similarWeight(weights: WeightEntry[], candidate: Omit<WeightEntry, 'id'>, excludeId?: string): WeightEntry | undefined {
  const day = isoToLocalDateString(candidate.date);
  return weights
    .filter((w) => w.id !== excludeId && isoToLocalDateString(w.date) === day && Math.abs(w.weightLbs - candidate.weightLbs) <= WEIGHT_TOLERANCE_LBS)
    .sort((a, b) => Math.abs(a.weightLbs - candidate.weightLbs) - Math.abs(b.weightLbs - candidate.weightLbs))[0];
}
