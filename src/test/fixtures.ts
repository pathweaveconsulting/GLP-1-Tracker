import { useStore } from '../store/useStore';
import type { DoseEvent, EffectEntry, Severity, WeightEntry } from '../types';

const DAY = 24 * 3600 * 1000;

/** Local-noon ISO string `daysAgo` days before today. */
export function isoDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

export function buildPopulated() {
  const weights: WeightEntry[] = [];
  for (let i = 84; i >= 0; i -= 3) {
    weights.push({ id: `w-${i}`, weightLbs: Math.round((220 - (84 - i) * 0.21) * 10) / 10, date: isoDaysAgo(i) });
  }
  const doses: DoseEvent[] = [];
  for (let i = 12; i >= 0; i--) {
    doses.push({
      id: `d-${i}`,
      medication: 'Tirzepatide',
      amountMg: i > 8 ? 2.5 : i > 4 ? 5 : 7.5,
      date: isoDaysAgo(i * 7 + 1),
      site: i % 2 ? 'Thigh: Left' : 'Abdomen: Lower Mid',
      painLevel: 1,
      notes: '',
    });
  }
  const sev: Severity[] = ['none', 'mild', 'moderate', 'none', 'mild'];
  const effects: EffectEntry[] = [];
  for (let i = 40; i >= 0; i--) {
    const s = (k: number): Severity => sev[(i + k) % sev.length];
    effects.push({
      id: `e-${i}`,
      date: isoDaysAgo(i),
      hunger: s(0), foodNoise: s(1), cravings: s(2), mood: 'none', energy: s(3),
      nausea: s(4), fatigue: s(0), constipation: s(1), diarrhea: 'none', reflux: s(2),
      appetiteLoss: s(3), bloating: 'none', dehydration: 'none', indigestion: 'none', insomnia: 'none',
      notes: '',
    });
  }
  return { weights, doses, effects };
}

export type Unit = 'lbs' | 'kg';

export function seedStore(mode: 'empty' | 'populated', unit: Unit) {
  const settings = {
    medication: 'Tirzepatide' as const,
    startingWeight: 220,
    targetWeight: 170,
    heightInches: 68,
    startDate: isoDaysAgo(84),
    weightUnit: unit,
  };
  const data = mode === 'populated' ? buildPopulated() : { weights: [], doses: [], effects: [] };
  useStore.setState({ ...data, settings });
}

export { DAY };
