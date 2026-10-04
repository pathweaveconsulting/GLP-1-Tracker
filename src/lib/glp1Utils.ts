import { DoseEvent } from '../types';

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

/**
 * Pharmacokinetic GLP-1 Serum Concentration (mg)
 * Uses 1-compartment subcutaneous model with ka (absorption) and ke (elimination)
 */
export function calculateMedicationLevelAtDate(
  doses: DoseEvent[], 
  targetDate: Date = new Date(),
  medicationFilter?: string
): number {
  if (!doses || doses.length === 0) return 0;

  const tHalfElim = 5.0; // 5 days elimination half-life for Tirzepatide/Retatrutide/Semaglutide
  const tHalfAbs = 0.5;  // 12 hours absorption half-life

  const ke = Math.LN2 / tHalfElim;
  const ka = Math.LN2 / tHalfAbs;

  let totalLevel = 0;
  const targetTime = targetDate.getTime();

  for (const dose of doses) {
    if (medicationFilter && (dose.medication || 'Tirzepatide').toLowerCase() !== medicationFilter.toLowerCase()) {
      continue;
    }

    const doseTime = new Date(dose.date).getTime();
    const diffDays = (targetTime - doseTime) / (1000 * 3600 * 24);

    if (diffDays >= 0) {
      // PK formula: D * ka / (ka - ke) * (exp(-ke * t) - exp(-ka * t))
      const contribution = dose.amountMg * (ka / (ka - ke)) * (Math.exp(-ke * diffDays) - Math.exp(-ka * diffDays));
      if (!isNaN(contribution) && contribution > 0) {
        totalLevel += contribution;
      }
    }
  }

  return Math.round(totalLevel * 100) / 100;
}

/**
 * Generates PK level curve points over a timeline range: '2 weeks' | '1 month' | '3 months' | 'All time'
 * Supports multi-medication curves (e.g. tirzepatide + retatrutide)
 */
export function generatePKCurve(
  doses: DoseEvent[],
  timeline: '2 weeks' | '1 month' | '3 months' | 'All time' = '3 months'
) {
  if (!doses || doses.length === 0) {
    return { 
      points: [], 
      currentLevel: 0, 
      peakLevel: 0, 
      percentOfPeak: 0, 
      medicationName: 'Tirzepatide',
      medicationsList: ['tirzepatide'],
      medLevels: { tirzepatide: 0 }
    };
  }

  const sortedDoses = [...doses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const now = new Date();
  const currentLevel = calculateMedicationLevelAtDate(sortedDoses, now);

  let startDate: Date;
  let endDate: Date = new Date(now.getTime() + 28 * 24 * 3600 * 1000); // 4 weeks future projection decay

  const earliestDoseDate = new Date(sortedDoses[0].date);

  switch (timeline) {
    case '2 weeks':
      startDate = new Date(now.getTime() - 14 * 24 * 3600 * 1000);
      break;
    case '1 month':
      startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      break;
    case 'All time':
      startDate = earliestDoseDate < new Date(now.getTime() - 30 * 24 * 3600 * 1000)
        ? earliestDoseDate
        : new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      break;
    case '3 months':
    default:
      startDate = new Date(now.getTime() - 90 * 24 * 3600 * 1000);
      break;
  }

  // Find all distinct medications logged
  const distinctMeds = Array.from(
    new Set(sortedDoses.map(d => (d.medication || 'Tirzepatide').toLowerCase()))
  );

  // Generate continuous sampling points across timeline
  const points: any[] = [];
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();
  const stepMs = (endMs - startMs) / 140;

  let peakLevel = 0;
  const lastMed = sortedDoses[sortedDoses.length - 1]?.medication || 'Retatrutide';

  const medLevelsNow: Record<string, number> = {};
  distinctMeds.forEach(m => {
    medLevelsNow[m] = calculateMedicationLevelAtDate(sortedDoses, now, m);
  });

  for (let t = startMs; t <= endMs; t += stepMs) {
    const pointDate = new Date(t);
    const totalLevel = calculateMedicationLevelAtDate(sortedDoses, pointDate);
    if (totalLevel > peakLevel) peakLevel = totalLevel;

    const isFuture = t > now.getTime();
    const dateStr = pointDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const pointObj: any = {
      dateStr,
      date: pointDate,
      level: totalLevel,
      totalLevel,
      isFuture
    };

    // Add per-medication serum levels to point
    distinctMeds.forEach(m => {
      pointObj[m] = calculateMedicationLevelAtDate(sortedDoses, pointDate, m);
    });

    points.push(pointObj);
  }

  const maxHistoricalLevel = Math.max(peakLevel, currentLevel, 1);
  const percentOfPeak = Math.min(100, Math.round((currentLevel / maxHistoricalLevel) * 100));

  return {
    points,
    currentLevel,
    peakLevel: Math.round(maxHistoricalLevel * 100) / 100,
    percentOfPeak,
    medicationName: lastMed,
    medicationsList: distinctMeds,
    medLevels: medLevelsNow
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

export function calculateShotPhase(doses: DoseEvent[]): ShotPhaseInfo {
  if (!doses || doses.length === 0) {
    return {
      phaseNumber: 1,
      totalPhases: 6,
      title: 'No Dose Logged',
      subtitle: 'Log your first dose',
      daysRange: '0d',
      percentComplete: 0,
      daysUntilNext: 7,
      nextDoseDate: new Date(),
      now: 'No dose logged yet. Record your injection to unlock accurate phase tracking and serum levels.',
      watch: 'Track baseline weight and appetite before first shot.',
      do: 'Ensure you have proper injection supplies and log your dose timestamp.',
      lastDose: null,
    };
  }

  const sorted = [...doses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const lastDose = sorted[sorted.length - 1];
  const lastDoseTime = new Date(lastDose.date);
  const now = new Date();

  const diffMs = now.getTime() - lastDoseTime.getTime();
  const diffHours = diffMs / (1000 * 3600);
  const diffDays = diffHours / 24;

  const nextDoseDate = new Date(lastDoseTime.getTime() + 7 * 24 * 3600 * 1000);
  const daysUntilNext = Math.max(0, Math.ceil((nextDoseDate.getTime() - now.getTime()) / (1000 * 3600 * 24)));
  const percentComplete = Math.min(100, Math.max(0, Math.round((diffDays / 7) * 100)));

  if (diffDays < 0.5) {
    return {
      phaseNumber: 1,
      totalPhases: 6,
      title: 'Injection Day',
      subtitle: '0d - 0.5d',
      daysRange: '0d - 0.5d',
      percentComplete,
      daysUntilNext,
      nextDoseDate,
      now: 'Dose administered. Medication absorbing into bloodstream.',
      watch: 'Injection site redness/soreness, initial mild nausea or stomach fullness.',
      do: 'Stay well hydrated with water and electrolytes | Eat light, high-protein meals.',
      lastDose,
    };
  } else if (diffDays < 2.0) {
    return {
      phaseNumber: 2,
      totalPhases: 6,
      title: 'Build Up Phase',
      subtitle: '0.5d - 2d',
      daysRange: '0.5d - 2d',
      percentComplete,
      daysUntilNext,
      nextDoseDate,
      now: 'Serum concentration rapidly increasing towards peak. Satiety feelings taking full effect.',
      watch: 'Early side effects like mild nausea, heartburn, or sluggish digestion.',
      do: 'Sip fluids constantly | Avoid heavy, fatty, or sugary foods.',
      lastDose,
    };
  } else if (diffDays < 3.5) {
    return {
      phaseNumber: 3,
      totalPhases: 6,
      title: 'Peak Phase',
      subtitle: '2d - 3.5d',
      daysRange: '2d - 3.5d',
      percentComplete,
      daysUntilNext,
      nextDoseDate,
      now: 'Maximum medication concentration in bloodstream. Maximum appetite suppression and food noise reduction.',
      watch: 'Low energy if calorie intake is too low, mild fatigue, dehydration.',
      do: 'Prioritize lean protein & fiber goals | Keep electrolyte intake steady.',
      lastDose,
    };
  } else if (diffDays < 5.0) {
    return {
      phaseNumber: 4,
      totalPhases: 6,
      title: 'Cruise Phase',
      subtitle: '3d - 5d',
      daysRange: '3d - 5d',
      percentComplete,
      daysUntilNext,
      nextDoseDate,
      now: 'Hunger stays quiet. Fullness feels normal. GLP 1 side effects fade. Glucagon continues calorie burn. Energy may rise.',
      watch: 'Constipation may be noticeable; otherwise milder symptoms.',
      do: 'Fiber + fluids | Balanced meals to maintain nutrition despite smaller portions.',
      lastDose,
    };
  } else if (diffDays < 6.0) {
    return {
      phaseNumber: 5,
      totalPhases: 6,
      title: 'Winding Down',
      subtitle: '5d - 6d',
      daysRange: '5d - 6d',
      percentComplete,
      daysUntilNext,
      nextDoseDate,
      now: 'Drug levels drop gradually. Ghrelin rises slightly. Appetite suppression and metabolic effects are still active, though hunger may rise.',
      watch: 'Mainly appetite returning; constipation may ease as GI speed normalizes.',
      do: 'Prepare for next dose; plan meals/snacks | Watch portions as hunger rises.',
      lastDose,
    };
  } else if (diffDays <= 7.0) {
    return {
      phaseNumber: 6,
      totalPhases: 6,
      title: 'Wear-Off Window',
      subtitle: '6d - 7d',
      daysRange: '6d - 7d',
      percentComplete,
      daysUntilNext,
      nextDoseDate,
      now: 'Drug levels continue dropping. Appetite suppression weakens noticeably. Hunger and cravings become more prominent as you approach your next dose.',
      watch: 'Increased hunger, possible food cravings, mood changes.',
      do: 'Plan for next shot; resist binge urges | Use volume foods and protein strategies.',
      lastDose,
    };
  } else {
    return {
      phaseNumber: 6,
      totalPhases: 6,
      title: 'Dose Due / Overdue',
      subtitle: '> 7d',
      daysRange: '> 7d',
      percentComplete: 100,
      daysUntilNext: 0,
      nextDoseDate,
      now: 'Dose interval reached or exceeded. Time for your next scheduled injection!',
      watch: 'Appetite and food noise returning to baseline.',
      do: 'Administer and log your next dose as prescribed.',
      lastDose,
    };
  }
}
