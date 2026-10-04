import { describe, it, expect } from 'vitest';
import { migrateStore, DEMO_ID_PATTERN } from './migrate';

const demoDose = { id: 'dose-3', medication: 'Tirzepatide', amountMg: 2.5, date: '2026-01-01T00:00:00Z', site: 'x', painLevel: 1, notes: '' };
const demoWeight = { id: 'weight-12', weightLbs: 210, date: '2026-01-01T00:00:00Z' };
const demoEffect = { id: 'effect-0', date: '2026-01-01T00:00:00Z' };
const oldSettings = { medication: 'Tirzepatide', startingWeight: 220, targetWeight: 170, heightInches: 68, startDate: '2026-01-01T00:00:00Z' };

describe('DEMO_ID_PATTERN', () => {
  it('matches only generated demo ids', () => {
    for (const id of ['dose-0', 'weight-60', 'effect-12']) expect(DEMO_ID_PATTERN.test(id)).toBe(true);
    for (const id of ['3f2b8c1e-aaaa-4bbb-8ccc-1234567890ab', 'dose-', 'dose-1a', 'my-weight-1', 'weight-1-x']) expect(DEMO_ID_PATTERN.test(id)).toBe(false);
  });
});

describe('migrateStore from the unversioned build', () => {
  it('maps legacy Rybelsus data to Other, not weekly semaglutide (F7)', () => {
    const real = { ...demoDose, id: 'abc-uuid', medication: 'Rybelsus' };
    const out = migrateStore({ doses: [real], weights: [], effects: [], settings: { ...oldSettings, medication: 'Rybelsus' } }, 0);
    expect(out.doses[0].medication).toBe('Other');
    expect(out.settings.medication).toBe('Other');
  });

  it('strips demo rows and sends a demo-only user back through onboarding', () => {
    const out = migrateStore({ doses: [demoDose], weights: [demoWeight], effects: [demoEffect], settings: oldSettings }, 0);
    expect(out.doses).toEqual([]);
    expect(out.weights).toEqual([]);
    expect(out.effects).toEqual([]);
    expect(out.hasOnboarded).toBe(false);
    // The old profile (220/170/68) was generated demo data, so it is not carried over.
    expect(out.settings.startingWeight).toBe(0);
    expect(out.settings.weightUnit).toBe('lbs');
  });

  it('keeps real (UUID) rows next to demo rows but never carries over the demo profile (F1)', () => {
    const real = { id: '3f2b8c1e-aaaa-4bbb-8ccc-1234567890ab', weightLbs: 201.2, date: '2026-02-01T12:00:00Z' };
    const out = migrateStore({ doses: [demoDose], weights: [demoWeight, real], effects: [demoEffect], settings: oldSettings }, 0);
    expect(out.weights).toEqual([real]);
    expect(out.doses).toEqual([]);
    // Real data survives, but the user must confirm a profile: the old 220 / 170 / 68 was generated.
    expect(out.hasOnboarded).toBe(false);
    expect(out.settings.startingWeight).toBe(0);
    expect(out.settings.targetWeight).toBe(0);
    expect(out.settings.heightInches).toBe(0);
    expect(out.settings.startDate).not.toBe(oldSettings.startDate);
    expect(out.settings.weightUnit).toBe('lbs');
    expect(JSON.stringify(out)).not.toMatch(/"(startingWeight|targetWeight|heightInches)":(220|170|68)\b/);
  });

  it('leaves already-versioned data untouched', () => {
    const v1 = { doses: [], weights: [{ id: 'a', weightLbs: 180, date: '2026-02-01T12:00:00Z' }], effects: [], settings: { ...oldSettings, weightUnit: 'kg' }, hasOnboarded: true };
    const out = migrateStore(v1, 1);
    expect(out.settings.startingWeight).toBe(220); // the user's own, confirmed profile
    expect(out.hasOnboarded).toBe(true);
    expect(out.weights).toEqual(v1.weights);
  });

  it('maps brand names to generics on settings and doses', () => {
    const real = { ...demoDose, id: 'abc-uuid', medication: 'Mounjaro' };
    const out = migrateStore({ doses: [real, { ...real, id: 'def-uuid', medication: 'Ozempic' }], weights: [], effects: [], settings: { ...oldSettings, medication: 'Zepbound' } }, 0);
    expect(out.doses.map((d) => d.medication)).toEqual(['Tirzepatide', 'Semaglutide']);
    expect(out.settings.medication).toBe('Tirzepatide');
  });

  it('preserves an explicit kg preference', () => {
    const real = { id: 'uuid-1', weightLbs: 200, date: '2026-02-01T12:00:00Z' };
    const out = migrateStore({ doses: [], weights: [real], effects: [], settings: { ...oldSettings, weightUnit: 'kg' } }, 0);
    expect(out.settings.weightUnit).toBe('kg');
  });

  it('survives garbage input', () => {
    for (const bad of [null, undefined, 'x', 42, { doses: 'nope', weights: [null, 5, {}] }]) {
      const out = migrateStore(bad, 0);
      expect(out.hasOnboarded).toBe(false);
      expect(out.doses).toEqual([]);
      expect(out.weights).toEqual([]);
    }
  });
});
