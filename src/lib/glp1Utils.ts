import { DoseEvent, Medication } from '../types';
import { medicationInfo, normalizeMedication } from './medications';

export const INJECTION_SITES_ABDOMEN = [
  'Abdomen: Upper Left',
  'Abdomen: Upper Mid',
  'Abdomen: Lower Left',
  'Abdomen: Lower Mid',
  'Abdomen: Upper Right',
  'Abdomen: Lower Right',
  'Abdomen: Mid Left',
  'Abdomen: Mid Right',
];

export const INJECTION_SITES_OTHER = [
  'Arm: Left',
  'Arm: Right',
  'Thigh: Left',
  'Thigh: Right',
  'Flank: Left',
  'Flank: Right',
];

export function getRecommendedNextSite(lastSite?: string, customSites: string[] = []): string {
  const allSites = [...INJECTION_SITES_ABDOMEN, ...INJECTION_SITES_OTHER, ...customSites];
  if (!lastSite) return INJECTION_SITES_ABDOMEN[3]; // Default to Lower Mid

  // Abdomen rotation order
  const abdIndex = INJECTION_SITES_ABDOMEN.indexOf(lastSite);
  if (abdIndex !== -1) {
    const nextAbdIndex = (abdIndex + 1) % INJECTION_SITES_ABDOMEN.length;
    return INJECTION_SITES_ABDOMEN[nextAbdIndex];
  }

  // Other rotation order
  const othIndex = INJECTION_SITES_OTHER.indexOf(lastSite);
  if (othIndex !== -1) {
    const nextOthIndex = (othIndex + 1) % INJECTION_SITES_OTHER.length;
    return INJECTION_SITES_OTHER[nextOthIndex];
  }

  // Fallback
  return allSites[0] || 'Abdomen: Lower Mid';
}

const DAY_MS = 86_400_000;
/** Absorption half-life (days) for the simplified subcutaneous model. Approximate. */
const ABSORPTION_HALF_LIFE_DAYS = 0.5;

/**
 * Simplified one-compartment subcutaneous model: amount (mg) of one dose still "in the system" `days` after injection.
 *   C(t) = D * ka / (ka - ke) * (exp(-ke t) - exp(-ka t))
 * When ka == ke the formula is 0/0, so the limit D * ka * t * exp(-ke t) is used instead.
 */
export function singleDoseLevel(amountMg: number, days: number, elimHalfLifeDays: number, absHalfLifeDays = ABSORPTION_HALF_LIFE_DAYS): number {
  if (!(days >= 0) || !(amountMg > 0) || !(elimHalfLifeDays > 0) || !(absHalfLifeDays > 0)) return 0;
  const ke = Math.LN2 / elimHalfLifeDays;
  const ka = Math.LN2 / absHalfLifeDays;
  const v =
    Math.abs(ka - ke) < 1e-9
      ? amountMg * ka * days * Math.exp(-ke * days)
      : amountMg * (ka / (ka - ke)) * (Math.exp(-ke * days) - Math.exp(-ka * days));
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/**
 * Estimated level (mg) at a moment, from logged doses. Each dose uses its own medication's approximate
 * half-life. Medications with no half-life data ("Other") contribute nothing.
 * Pass `medicationFilter` to count a single medication; different drugs are never meant to be summed.
 */
export function calculateMedicationLevelAtDate(
  doses: DoseEvent[],
  targetDate: Date = new Date(),
  medicationFilter?: string,
): number {
  if (!doses || doses.length === 0) return 0;
  let total = 0;
  const targetTime = targetDate.getTime();
  for (const dose of doses) {
    if (medicationFilter && dose.medication.toLowerCase() !== medicationFilter.toLowerCase()) continue;
    const halfLife = medicationInfo(dose.medication).halfLifeDays;
    if (!halfLife) continue;
    total += singleDoseLevel(dose.amountMg, (targetTime - new Date(dose.date).getTime()) / DAY_MS, halfLife);
  }
  return Math.round(total * 100) / 100;
}

/** Highest modelled level of one medication across its whole logged history, up to `now`. */
export function historicalPeak(doses: DoseEvent[], medication: string, now: Date): number {
  const mine = doses.filter((d) => d.medication.toLowerCase() === medication.toLowerCase());
  if (mine.length === 0) return 0;
  const start = Math.min(...mine.map((d) => new Date(d.date).getTime()));
  const end = now.getTime();
  const step = Math.max(6 * 3600_000, (end - start) / 3000);
  let peak = 0;
  for (let t = start; t <= end; t += step) peak = Math.max(peak, calculateMedicationLevelAtDate(mine, new Date(t), medication));
  return Math.max(peak, calculateMedicationLevelAtDate(mine, now, medication));
}

export interface PKPoint {
  dateStr: string;
  date: Date;
  isFuture: boolean;
  /** Level of the headline (most recently dosed) medication. */
  level: number;
  [medication: string]: number | string | boolean | Date;
}

/**
 * Generates PK level curve points over a timeline range: '2 weeks' | '1 month' | '3 months' | 'All time'.
 * `currentLevel`, `peakLevel` and `percentOfPeak` describe the MOST RECENTLY DOSED medication only;
 * `mixedMedications` is true when the history contains more than one, in which case the chart draws one
 * line per medication and nothing is added together.
 */
export function generatePKCurve(
  doses: DoseEvent[],
  timeline: '2 weeks' | '1 month' | '3 months' | 'All time' = '3 months',
  nowDate: Date = new Date(),
) {
  if (!doses || doses.length === 0) {
    return {
      points: [] as PKPoint[],
      currentLevel: 0,
      peakLevel: 0,
      percentOfPeak: 0,
      medicationName: 'Tirzepatide' as Medication,
      medicationsList: [] as string[],
      medLevels: {} as Record<string, number>,
      mixedMedications: false,
      modelled: false,
    };
  }

  const sortedDoses = [...doses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const now = nowDate;
  const headline = sortedDoses[sortedDoses.length - 1].medication;
  const modelled = medicationInfo(headline).halfLifeDays != null;

  const distinctMeds = Array.from(new Set(sortedDoses.map((d) => d.medication.toLowerCase())))
    .filter((m) => medicationInfo(normalizeMedication(m)).halfLifeDays != null);
  const mixedMedications = distinctMeds.length > 1;

  const currentLevel = calculateMedicationLevelAtDate(sortedDoses, now, headline);
  const peakLevel = Math.round(historicalPeak(sortedDoses, headline, now) * 100) / 100;
  const percentOfPeak = peakLevel > 0 ? Math.min(100, Math.round((currentLevel / peakLevel) * 100)) : 0;

  const earliest = new Date(sortedDoses[0].date);
  const endMs = now.getTime() + 28 * DAY_MS; // 4 weeks of decay, assuming no further doses
  let startMs: number;
  switch (timeline) {
    case '2 weeks': startMs = now.getTime() - 14 * DAY_MS; break;
    case '1 month': startMs = now.getTime() - 30 * DAY_MS; break;
    case 'All time': startMs = Math.min(earliest.getTime(), now.getTime() - 30 * DAY_MS); break;
    case '3 months':
    default: startMs = now.getTime() - 90 * DAY_MS; break;
  }

  const points: PKPoint[] = [];
  const stepMs = (endMs - startMs) / 140;
  for (let t = startMs; t <= endMs; t += stepMs) {
    const pointDate = new Date(t);
    const point: PKPoint = {
      dateStr: pointDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      date: pointDate,
      isFuture: t > now.getTime(),
      level: calculateMedicationLevelAtDate(sortedDoses, pointDate, headline),
    };
    distinctMeds.forEach((m) => {
      point[m] = calculateMedicationLevelAtDate(sortedDoses, pointDate, m);
    });
    points.push(point);
  }

  const medLevels: Record<string, number> = {};
  distinctMeds.forEach((m) => {
    medLevels[m] = calculateMedicationLevelAtDate(sortedDoses, now, m);
  });

  return {
    points,
    currentLevel,
    peakLevel,
    percentOfPeak,
    medicationName: headline,
    medicationsList: distinctMeds,
    medLevels,
    mixedMedications,
    modelled,
  };
}

export interface ShotPhaseInfo {
  phaseNumber: number;
  totalPhases: number;
  title: string;
  subtitle: string;
  daysRange: string;
  percentComplete: number;
  daysUntilNext: number;
  nextDoseDate: Date;
  now: string;
  watch: string;
  do: string;
  lastDose: DoseEvent | null;
}

/**
 * Where the user is in a typical once-weekly cycle, from the date of their last logged dose.
 * The wording is general ("often", "typically"): it describes common patterns, not this person's body.
 */
export function calculateShotPhase(doses: DoseEvent[], nowDate: Date = new Date()): ShotPhaseInfo {
  if (!doses || doses.length === 0) {
    return {
      phaseNumber: 1,
      totalPhases: 6,
      title: 'No Dose Logged',
      subtitle: 'Log your first dose',
      daysRange: '0d',
      percentComplete: 0,
      daysUntilNext: 7,
      nextDoseDate: nowDate,
      now: 'No dose logged yet. Record your injection to see where you are in the weekly cycle.',
      watch: 'It can help to note your baseline weight and appetite before your first shot.',
      do: 'Follow your prescriber’s instructions for your first dose, then log it here.',
      lastDose: null,
    };
  }

  const sorted = [...doses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const lastDose = sorted[sorted.length - 1];
  const lastDoseTime = new Date(lastDose.date);
  const now = nowDate;

  const diffDays = (now.getTime() - lastDoseTime.getTime()) / DAY_MS;
  const nextDoseDate = new Date(lastDoseTime.getTime() + 7 * DAY_MS);
  const daysUntilNext = Math.max(0, Math.ceil((nextDoseDate.getTime() - now.getTime()) / DAY_MS));
  const percentComplete = Math.min(100, Math.max(0, Math.round((diffDays / 7) * 100)));

  const base = { totalPhases: 6, percentComplete, daysUntilNext, nextDoseDate, lastDose };

  if (medicationInfo(lastDose.medication).intervalDays == null) {
    return {
      ...base,
      phaseNumber: 0,
      title: 'Schedule Not Tracked',
      subtitle: '',
      daysRange: '',
      now: 'The weekly cycle only applies to the once-weekly medications this app knows about, so it can’t place you in a cycle for this one.',
      watch: 'Your own symptom and weight logs still work as normal.',
      do: 'Follow the schedule your prescriber gave you.',
    };
  }

  if (diffDays < 0.5) {
    return { ...base, phaseNumber: 1, title: 'Injection Day', subtitle: '0d - 0.5d', daysRange: '0d - 0.5d',
      now: 'A dose was logged. The medication typically absorbs over the next day or two.',
      watch: 'Injection site redness or soreness, and sometimes mild nausea or a full feeling.',
      do: 'Sip fluids through the day | Lighter, protein-rich meals are often easier to tolerate.' };
  } else if (diffDays < 2.0) {
    return { ...base, phaseNumber: 2, title: 'Build Up Phase', subtitle: '0.5d - 2d', daysRange: '0.5d - 2d',
      now: 'Levels are usually rising toward their peak, and fullness often becomes more noticeable.',
      watch: 'Early side effects such as mild nausea, heartburn or slower digestion are common.',
      do: 'Keep sipping fluids | Heavy, fatty or very sugary foods are often harder to tolerate.' };
  } else if (diffDays < 3.5) {
    return { ...base, phaseNumber: 3, title: 'Peak Phase', subtitle: '2d - 3.5d', daysRange: '2d - 3.5d',
      now: 'Levels are typically at or near their highest. Appetite suppression and quieter food noise are often strongest around now.',
      watch: 'Tiredness if you are eating very little, and dehydration.',
      do: 'Prioritise protein and fluids, and keep up your electrolytes if your care team recommends them.' };
  } else if (diffDays < 5.0) {
    return { ...base, phaseNumber: 4, title: 'Cruise Phase', subtitle: '3d - 5d', daysRange: '3d - 5d',
      now: 'Appetite control is often steady at this point, and early side effects commonly ease. Energy may feel steadier.',
      watch: 'Constipation can show up now; other symptoms are often milder.',
      do: 'Fluids and fibre | Balanced meals, even when portions are small.' };
  } else if (diffDays < 6.0) {
    return { ...base, phaseNumber: 5, title: 'Winding Down', subtitle: '5d - 6d', daysRange: '5d - 6d',
      now: 'Levels typically start to fall, and hunger often creeps back a little.',
      watch: 'Appetite returning; constipation may ease as digestion speeds up.',
      do: 'Plan meals and snacks ahead | Keep an eye on portions as hunger returns.' };
  } else if (diffDays <= 7.0) {
    return { ...base, phaseNumber: 6, title: 'Wear-Off Window', subtitle: '6d - 7d', daysRange: '6d - 7d',
      now: 'Levels continue to fall. Appetite often returns and cravings can feel stronger as the next dose approaches.',
      watch: 'More hunger, possible cravings, and mood changes for some people.',
      do: 'Plan ahead for your next dose | Volume foods and protein can help with hunger.' };
  }
  return { ...base, phaseNumber: 6, percentComplete: 100, daysUntilNext: 0, title: 'Past Your Usual Interval', subtitle: '> 7d', daysRange: '> 7d',
    now: 'It has been more than 7 days since your last logged dose. If you missed one, check your medication’s missed-dose guidance or ask your prescriber or pharmacist, and never take a double dose to catch up.',
    watch: 'Appetite and food noise may be returning toward your baseline.',
    do: 'If you did take a dose and forgot to log it, add it so your history stays accurate.' };
}
