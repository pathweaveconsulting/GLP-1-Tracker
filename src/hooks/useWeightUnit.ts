import { useStore } from '../store/useStore';
import { getWeightUnit, WeightUnit } from '../lib/units';

/** The user's display unit for weights ('lbs' unless they chose kg). */
export function useWeightUnit(): WeightUnit {
  return useStore((s) => getWeightUnit(s.settings));
}
