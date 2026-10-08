import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, PersistedData } from '../types';
import { newId } from '../lib/id';
import { emptyData, migrateStore, STORE_VERSION } from './migrate';
import { CORRUPT_KEY, STORAGE_KEY, ROLLBACK_KEY } from './keys';
import { createSafeStorage, resumeWrites, storageEvents, storageReport } from './storage';
import { clearBackupReminder } from '../lib/backupReminder';
import { hasVault, isVaultUnlocked, writeVaultSlot } from '../lib/vault';
import { replaceDailyLogs } from './dailyLogs';
import { provenanceHint } from './mainSlot';

/** Replace the record equal to `expected` with `next` (same ID, same position); undefined when it changed or is gone. */
function replaceExact<T extends { id: string }>(list: T[], expected: T, next: Omit<T, 'id'>): T[] | undefined {
  const index = list.findIndex((r) => r.id === expected.id);
  if (index < 0 || JSON.stringify(list[index]) !== JSON.stringify(expected)) return undefined;
  const updated = { ...expected, ...next, id: expected.id } as T; // keeps the original key order and identity
  return [...list.slice(0, index), updated, ...list.slice(index + 1)];
}

export { STORAGE_KEY, CORRUPT_KEY };

// After the user dismisses the banner it stays away until the page is reloaded, even if later writes also fail.
let storageErrorDismissed = false;

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      ...emptyData(),
      skippedEntries: 0,
      rescueKept: true,
      unreadable: false,
      malformed: false,
      readFailed: false,
      startFresh: () => {
        // Explicit consent to replace whatever could not be read: resume saving and write what is in memory now.
        resumeWrites();
        set({ readFailed: false });
      },
      storageError: false,
      dismissStorageError: () => {
        storageErrorDismissed = true;
        set({ storageError: false });
      },
      dismissSkippedNotice: () => set({ skippedEntries: 0, unreadable: false, malformed: false }),

      completeOnboarding: (settings, opts) =>
        set((state) => ({
          settings,
          hasOnboarded: true,
          // A returning user already has real weigh-ins; seeding another would duplicate their data.
          weights:
            opts?.seedStartingWeight === false
              ? state.weights
              : [...state.weights, { id: newId(), weightLbs: settings.startingWeight, date: settings.startDate }],
        })),

      resetAllData: () => {
        if (isVaultUnlocked()) {
          void replaceDailyLogs([]).catch(() => storageEvents.onWriteError?.());
          void writeVaultSlot(ROLLBACK_KEY, null).catch(() => storageEvents.onWriteError?.());
        }
        clearBackupReminder();
        resumeWrites(); // Erase is an explicit action, so saving resumes
        set({ ...emptyData(), skippedEntries: 0, unreadable: false, malformed: false, readFailed: false });
        useStore.persist.clearStorage();
        // "Erase" must remove everything the app keeps, including a rescue copy of unreadable data.
        try {
          if (hasVault()) void writeVaultSlot(CORRUPT_KEY, null).catch(() => storageEvents.onWriteError?.());
          else localStorage.removeItem(CORRUPT_KEY);
        } catch {
          // ignore
        }
      },

      replaceAllData: (data) => {
        if (isVaultUnlocked()) void replaceDailyLogs(data.dailyLogs ?? []).catch(() => storageEvents.onWriteError?.());
        set({ doses: data.doses, weights: data.weights, effects: data.effects, settings: data.settings, hasOnboarded: true });
      },

      addWeights: (rows) => {
        // In an upgraded vault these rows are recorded as one CSV import batch (no effect on original-format data).
        provenanceHint('csv_import', newId());
        set((state) => ({ weights: [...state.weights, ...rows.map((r) => ({ ...r, id: newId() }))] }));
      },

      addDose: (dose) => set((state) => ({ doses: [...state.doses, { ...dose, id: newId() }] })),
      updateDose: (id, updatedDose) =>
        set((state) => ({ doses: state.doses.map((d) => (d.id === id ? { ...d, ...updatedDose } : d)) })),
      editDose: (expected, next) => {
        const doses = replaceExact(useStore.getState().doses, expected, next);
        if (!doses) return false;
        set({ doses });
        return true;
      },
      deleteDose: (id) => set((state) => ({ doses: state.doses.filter((d) => d.id !== id) })),
      restoreDose: (dose, originalIndex) => {
        if (useStore.getState().doses.some(d => d.id === dose.id)) return false;
        if (originalIndex !== undefined && (!Number.isInteger(originalIndex) || originalIndex < 0)) return false;
        set(state => { const i = Math.min(originalIndex ?? state.doses.length,state.doses.length); return {doses:[...state.doses.slice(0,i),dose,...state.doses.slice(i)]}; });
        return true;
      },

      addWeight: (weight) => set((state) => ({ weights: [...state.weights, { ...weight, id: newId() }] })),
      updateWeight: (id, updatedWeight) =>
        set((state) => ({ weights: state.weights.map((w) => (w.id === id ? { ...w, ...updatedWeight } : w)) })),
      editWeight: (expected, next) => {
        const weights = replaceExact(useStore.getState().weights, expected, next);
        if (!weights) return false;
        set({ weights });
        return true;
      },
      deleteWeight: (id) => set((state) => ({ weights: state.weights.filter((w) => w.id !== id) })),
      restoreWeight: (weight, originalIndex) => {
        if (useStore.getState().weights.some(w => w.id === weight.id)) return false;
        if (originalIndex !== undefined && (!Number.isInteger(originalIndex) || originalIndex < 0)) return false;
        set(state => { const i = Math.min(originalIndex ?? state.weights.length,state.weights.length); return {weights:[...state.weights.slice(0,i),weight,...state.weights.slice(i)]}; });
        return true;
      },

      addEffect: (effect) => set((state) => ({ effects: [...state.effects, { ...effect, id: newId() }] })),
      deleteEffect: (id) => set((state) => ({ effects: state.effects.filter((e) => e.id !== id) })),
      restoreEffect: (effect) => set((state) => ({ effects: state.effects.some((e) => e.id === effect.id) ? state.effects : [...state.effects, effect] })),
      updateEffect: (id, updatedEffect) =>
        set((state) => ({ effects: state.effects.map((e) => (e.id === id ? { ...e, ...updatedEffect } : e)) })),

      updateSettings: (settings) => set((state) => ({ settings: { ...state.settings, ...settings } })),
    }),
    {
      name: STORAGE_KEY,
      version: STORE_VERSION,
      storage: createSafeStorage<PersistedData>(),
      merge: (persisted, current) => ({ ...current, ...(persisted as object), skippedEntries: storageReport.skipped, rescueKept: storageReport.rescueKept, unreadable: storageReport.unreadable, malformed: storageReport.malformed, readFailed: storageReport.readFailed }),
      migrate: (persisted, version) => migrateStore(persisted, version) as unknown as AppState,
      // Persist data only, never the action functions.
      partialize: (state): PersistedData => ({
        doses: state.doses,
        weights: state.weights,
        effects: state.effects,
        settings: state.settings,
        hasOnboarded: state.hasOnboarded,
      }),
    },
  ),
);

// Writes that fail (quota / blocked storage) raise a flag instead of throwing; a later success clears it.
storageEvents.onWriteError = () => {
  if (!storageErrorDismissed && !useStore.getState().storageError) useStore.setState({ storageError: true });
};
storageEvents.onWriteOk = () => {
  if (useStore.getState().storageError) useStore.setState({ storageError: false });
};
