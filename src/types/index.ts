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
  /** Pounds (canonical storage unit). */
  startingWeight: number;
  /** Pounds (canonical storage unit). */
  targetWeight: number;
  heightInches: number;
  startDate: string; // ISO format
  /** Display preference only; stored weights are always pounds. Defaults to 'lbs'. */
  weightUnit?: 'lbs' | 'kg';
  customSites?: string[];
  customEffectNames?: string[];
}

export interface PersistedData {
  doses: DoseEvent[];
  weights: WeightEntry[];
  effects: EffectEntry[];
  settings: UserSettings;
  hasOnboarded: boolean;
}

export interface AppState extends PersistedData {
  /** Rows that could not be read when the stored data was loaded (not persisted). */
  skippedEntries: number;
  /** False when the copy of unreadable data could not be stored (storage full), so the notice must not claim one. Not persisted. */
  rescueKept: boolean;
  /** True when the whole stored blob could not be read (truncated or not JSON), so the app started empty. Not persisted. */
  unreadable: boolean;
  /** True when reading storage threw at startup; saving is paused until the user acts. Not persisted. */
  readFailed: boolean;
  /** Explicit action: replace whatever could not be read, resume saving. */
  startFresh: () => void;
  dismissSkippedNotice: () => void;
  /** True while the browser refuses to save (storage full or blocked); data then lives in memory only. Not persisted. */
  storageError: boolean;
  dismissStorageError: () => void;
  /** Saves the profile, flags onboarding done and seeds the starting weight as the first weight entry. */
  completeOnboarding: (settings: UserSettings, opts?: { seedStartingWeight?: boolean }) => void;
  /** Wipes every log and the profile and returns the app to first-run state. */
  resetAllData: () => void;
  /** Replaces everything with a validated backup. */
  replaceAllData: (data: { settings: UserSettings; doses: DoseEvent[]; weights: WeightEntry[]; effects: EffectEntry[] }) => void;
  /** Adds several weigh-ins at once (e.g. from a CSV import). */
  addWeights: (rows: Array<Omit<WeightEntry, 'id'>>) => void;
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
