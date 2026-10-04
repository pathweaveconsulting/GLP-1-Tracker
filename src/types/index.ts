export type Medication = 'Semaglutide' | 'Tirzepatide' | 'Retatrutide' | 'Other';

export interface DoseEvent {
  id: string;
  medication: Medication;
  amountMg: number;
  date: string; // ISO format
  site: string; // e.g., 'Left Thigh', 'Right Stomach'
  painLevel: number; // 0-10
  notes: string;
}

export interface WeightEntry {
  id: string;
  weightLbs: number;
  date: string; // ISO format
}

export type Severity = 'none' | 'mild' | 'moderate' | 'severe';

export interface EffectEntry {
  id: string;
  date: string; // ISO format (representing the day)
  hunger: Severity;
  foodNoise: Severity;
  cravings: Severity;
  mood: Severity;
  energy: Severity;
  nausea: Severity;
  fatigue: Severity;
  constipation: Severity;
  diarrhea: Severity;
  reflux: Severity;
  appetiteLoss: Severity;
  bloating: Severity;
  dehydration: Severity;
  indigestion: Severity;
  insomnia: Severity;
  customEffects?: Record<string, Severity>;
  notes: string;
}

export interface UserSettings {
  medication: Medication;
  startingWeight: number;
  targetWeight: number;
  heightInches: number;
  startDate: string; // ISO format
  weightUnit?: 'lbs' | 'kg';
  customSites?: string[];
  customEffectNames?: string[];
}

export interface AppState {
  doses: DoseEvent[];
  weights: WeightEntry[];
  effects: EffectEntry[];
  settings: UserSettings;
  addDose: (dose: Omit<DoseEvent, 'id'>) => void;
  updateDose: (id: string, dose: Partial<DoseEvent>) => void;
  deleteDose: (id: string) => void;
  addWeight: (weight: Omit<WeightEntry, 'id'>) => void;
  updateWeight: (id: string, weight: Partial<WeightEntry>) => void;
  deleteWeight: (id: string) => void;
  addEffect: (effect: Omit<EffectEntry, 'id'>) => void;
  updateEffect: (id: string, effect: Partial<EffectEntry>) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
}
