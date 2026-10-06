import { describe, it, expect } from 'vitest';
import type { EffectEntry, Severity } from '../types';
import { latestEffectWithin, recentSymptomSummary, trackedFields, normalizeSeverity } from './symptoms';

const NOW = new Date(2026, 5, 15, 10, 0, 0);
const at = (daysAgo: number) => new Date(2026, 5, 15 - daysAgo, 12, 0, 0).toISOString();
const none: Severity = 'none';
const entry = (daysAgo: number, over: Partial<EffectEntry> = {}): EffectEntry => ({
  id: `e${daysAgo}`, date: at(daysAgo), hunger: none, foodNoise: none, cravings: none, mood: none, energy: none, nausea: none,
  fatigue: none, constipation: none, diarrhea: none, reflux: none, appetiteLoss: none, bloating: none, dehydration: none,
  indigestion: none, insomnia: none, notes: '', ...over,
});

describe('latestEffectWithin', () => {
  it('returns the newest log only when it is at most 3 days old', () => {
    expect(latestEffectWithin([entry(2), entry(5)], NOW)?.id).toBe('e2');
    expect(latestEffectWithin([entry(4)], NOW)).toBeNull();
    expect(latestEffectWithin([], NOW)).toBeNull();
  });
});

describe('recentSymptomSummary', () => {
  it('lists only symptoms that were really logged, worst first, within the window', () => {
    const s = recentSymptomSummary(
      [entry(10, { nausea: 'severe' }), entry(3, { nausea: 'mild', fatigue: 'moderate' }), entry(1, { fatigue: 'mild', customEffects: { Headache: 'mild' } })],
      NOW,
    );
    expect(s.daysLogged).toBe(2);
    expect(s.items.map((i) => [i.label, i.peak, i.daysPresent])).toEqual([
      ['Fatigue', 'moderate', 2],
      ['Nausea', 'mild', 1],
      ['Headache', 'mild', 1],
    ]);
  });
  it('is empty when nothing was logged', () => {
    expect(recentSymptomSummary([], NOW)).toEqual({ windowDays: 7, daysLogged: 0, items: [] });
  });
});

describe('trackedFields', () => {
  it('adds optional fields only when they hold real data', () => {
    expect(trackedFields([entry(1)]).some((f) => f.key === 'mood')).toBe(false);
    expect(trackedFields([entry(1, { mood: 'mild' })]).some((f) => f.key === 'mood')).toBe(true);
  });
});

describe('normalizeSeverity', () => {
  it('maps loose text and falls back to none', () => {
    expect(normalizeSeverity('MODERATE')).toBe('moderate');
    expect(normalizeSeverity(' high ')).toBe('severe');
    expect(normalizeSeverity('banana')).toBe('none');
    expect(normalizeSeverity(undefined)).toBe('none');
  });
});
