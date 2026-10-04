import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { subDays, formatISO } from 'date-fns';
import { AppState, DoseEvent, WeightEntry, EffectEntry, UserSettings } from '../types';

const generateMockData = () => {
  const doses: DoseEvent[] = [];
  const weights: WeightEntry[] = [];
  const effects: EffectEntry[] = [];
  
  const today = new Date();
  
  // Settings
  const settings: UserSettings = {
    medication: 'Tirzepatide',
    startingWeight: 220,
    targetWeight: 170,
    heightInches: 68,
    startDate: formatISO(subDays(today, 60))
  };

  // Generate 8 weeks of data
  for (let i = 8; i >= 0; i--) {
    const doseDate = subDays(today, i * 7);
    doses.push({
      id: `dose-${i}`,
      medication: 'Tirzepatide',
      amountMg: i < 4 ? 2.5 : 5.0, // Stepped up dose
      date: formatISO(doseDate),
      site: i % 2 === 0 ? 'Left Thigh' : 'Right Thigh',
      painLevel: 1,
      notes: ''
    });
  }

  // Weight entries (trend downwards)
  let currentWeight = settings.startingWeight;
  for (let i = 60; i >= 0; i -= Math.floor(Math.random() * 3) + 1) { // 1 to 3 days between logs
    const date = subDays(today, i);
    weights.push({
      id: `weight-${i}`,
      weightLbs: currentWeight,
      date: formatISO(date)
    });
    currentWeight -= Math.random() * 0.5; // lose some weight
  }

  // Effect entries
  for (let i = 60; i >= 0; i--) {
    const date = subDays(today, i);
    effects.push({
      id: `effect-${i}`,
      date: formatISO(date),
      hunger: Math.random() > 0.7 ? 'mild' : 'none',
      foodNoise: Math.random() > 0.8 ? 'mild' : 'none',
      cravings: Math.random() > 0.8 ? 'mild' : 'none',
      mood: 'none',
      energy: Math.random() > 0.8 ? 'mild' : 'none',
      nausea: Math.random() > 0.9 ? 'mild' : 'none',
      fatigue: Math.random() > 0.85 ? 'mild' : 'none',
      constipation: Math.random() > 0.9 ? 'mild' : 'none',
      diarrhea: 'none',
      reflux: Math.random() > 0.85 ? 'mild' : 'none',
      appetiteLoss: Math.random() > 0.5 ? 'moderate' : 'mild',
      bloating: 'none',
      dehydration: 'none',
      indigestion: 'none',
      insomnia: 'none',
      notes: ''
    });
  }

  return { doses, weights, effects, settings };
};

const initialData = generateMockData();

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      doses: initialData.doses,
      weights: initialData.weights,
      effects: initialData.effects,
      settings: initialData.settings,
      
      addDose: (dose) => set((state) => ({ 
        doses: [...state.doses, { ...dose, id: crypto.randomUUID() }] 
      })),
      updateDose: (id, updatedDose) => set((state) => ({
        doses: state.doses.map(d => d.id === id ? { ...d, ...updatedDose } : d)
      })),
      deleteDose: (id) => set((state) => ({
        doses: state.doses.filter(d => d.id !== id)
      })),
      
      addWeight: (weight) => set((state) => ({
        weights: [...state.weights, { ...weight, id: crypto.randomUUID() }]
      })),
      updateWeight: (id, updatedWeight) => set((state) => ({
        weights: state.weights.map(w => w.id === id ? { ...w, ...updatedWeight } : w)
      })),
      deleteWeight: (id) => set((state) => ({
        weights: state.weights.filter(w => w.id !== id)
      })),

      addEffect: (effect) => set((state) => ({
        effects: [...state.effects, { ...effect, id: crypto.randomUUID() }]
      })),
      updateEffect: (id, updatedEffect) => set((state) => ({
        effects: state.effects.map(e => e.id === id ? { ...e, ...updatedEffect } : e)
      })),

      updateSettings: (settings) => set((state) => ({
        settings: { ...state.settings, ...settings }
      }))
    }),
    {
      name: 'glp1-tracker-storage',
    }
  )
);
