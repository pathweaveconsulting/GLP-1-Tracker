import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, PersistedData } from '../types';
import { newId } from '../lib/id';
import { emptyData, migrateStore, STORE_VERSION } from './migrate';

export const STORAGE_KEY = 'glp1-tracker-storage';

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      ...emptyData(),

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
        set(emptyData());
        useStore.persist.clearStorage();
      },

      replaceAllData: (data) =>
        set({ doses: data.doses, weights: data.weights, effects: data.effects, settings: data.settings, hasOnboarded: true }),

      addWeights: (rows) =>
        set((state) => ({ weights: [...state.weights, ...rows.map((r) => ({ ...r, id: newId() }))] })),

      addDose: (dose) => set((state) => ({ doses: [...state.doses, { ...dose, id: newId() }] })),
      updateDose: (id, updatedDose) =>
        set((state) => ({ doses: state.doses.map((d) => (d.id === id ? { ...d, ...updatedDose } : d)) })),
      deleteDose: (id) => set((state) => ({ doses: state.doses.filter((d) => d.id !== id) })),

      addWeight: (weight) => set((state) => ({ weights: [...state.weights, { ...weight, id: newId() }] })),
      updateWeight: (id, updatedWeight) =>
        set((state) => ({ weights: state.weights.map((w) => (w.id === id ? { ...w, ...updatedWeight } : w)) })),
      deleteWeight: (id) => set((state) => ({ weights: state.weights.filter((w) => w.id !== id) })),

      addEffect: (effect) => set((state) => ({ effects: [...state.effects, { ...effect, id: newId() }] })),
      updateEffect: (id, updatedEffect) =>
        set((state) => ({ effects: state.effects.map((e) => (e.id === id ? { ...e, ...updatedEffect } : e)) })),

      updateSettings: (settings) => set((state) => ({ settings: { ...state.settings, ...settings } })),
    }),
    {
      name: STORAGE_KEY,
      version: STORE_VERSION,
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
