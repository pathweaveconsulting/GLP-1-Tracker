import { describe, it, expect } from 'vitest';
import { MEDICATION_INFO, MEDICATION_OPTIONS, defaultDoseAmount, doseWarning, normalizeMedication, dosingIntervalDays } from './medications';

describe('normalizeMedication', () => {
  it('maps brands to generics, case-insensitively', () => {
    for (const b of ['Mounjaro', 'zepbound', ' TIRZEPATIDE ']) expect(normalizeMedication(b)).toBe('Tirzepatide');
    for (const b of ['Ozempic', 'Wegovy', 'Rybelsus', 'semaglutide']) expect(normalizeMedication(b)).toBe('Semaglutide');
    expect(normalizeMedication('retatrutide')).toBe('Retatrutide');
  });
  it('never guesses a specific drug for unknown input', () => {
    for (const v of ['', 'banana', undefined, null, 5, {}]) expect(normalizeMedication(v)).toBe('Other');
  });
});

describe('reference data', () => {
  it('offers exactly the tracked generics in the dropdowns', () => {
    expect([...MEDICATION_OPTIONS]).toEqual(['Tirzepatide', 'Semaglutide', 'Retatrutide', 'Other']);
    expect(Object.keys(MEDICATION_INFO).sort()).toEqual([...MEDICATION_OPTIONS].sort());
  });
  it('has the specified half-lives, steps and flags', () => {
    expect(MEDICATION_INFO.Tirzepatide.halfLifeDays).toBe(5);
    expect(MEDICATION_INFO.Tirzepatide.doseSteps).toEqual([2.5, 5, 7.5, 10, 12.5, 15]);
    expect(MEDICATION_INFO.Semaglutide.halfLifeDays).toBe(7);
    expect(MEDICATION_INFO.Semaglutide.doseSteps).toEqual([0.25, 0.5, 1, 1.7, 2, 2.4]);
    expect(MEDICATION_INFO.Retatrutide.investigational).toBe(true);
    expect(MEDICATION_INFO.Retatrutide.halfLifeDays).toBe(6);
    expect(MEDICATION_INFO.Tirzepatide.investigational).toBe(false);
    expect(dosingIntervalDays('Other')).toBeNull();
    expect(dosingIntervalDays('Tirzepatide')).toBe(7);
  });
  it('every missed-dose note says never to double up', () => {
    for (const m of MEDICATION_OPTIONS) expect(MEDICATION_INFO[m].missedDoseNote).toMatch(/never take (two|a double)/i);
  });
});

describe('doseWarning', () => {
  it('is silent for standard steps', () => {
    expect(doseWarning('Tirzepatide', 5)).toBeNull();
    expect(doseWarning('Semaglutide', 1.7)).toBeNull();
  });
  it('requires confirmation above the standard maximum', () => {
    const w = doseWarning('Tirzepatide', 20)!;
    expect(w.requiresConfirmation).toBe(true);
    expect(w.level).toBe('caution');
    expect(w.text).toMatch(/above the usual maximum of 15 mg/);
    expect(doseWarning('Semaglutide', 3)!.requiresConfirmation).toBe(true);
    expect(doseWarning('Tirzepatide', 15)).toBeNull();
  });
  it('flags non-standard steps without blocking', () => {
    const w = doseWarning('Tirzepatide', 6)!;
    expect(w.level).toBe('info');
    expect(w.requiresConfirmation).toBe(false);
  });
  it('rejects zero, negative and non-numeric amounts', () => {
    for (const v of [0, -1, Number.NaN, Infinity]) expect(doseWarning('Tirzepatide', v)!.level).toBe('error');
  });
  it('warns about the investigational drug and stays quiet about steps for Other', () => {
    expect(doseWarning('Retatrutide', 4)!.text).toMatch(/investigational/);
    expect(doseWarning('Other', 3)).toBeNull();
  });
});

describe('defaultDoseAmount', () => {
  const hist = [
    { medication: 'Tirzepatide' as const, amountMg: 5, date: '2026-05-01T12:00:00Z' },
    { medication: 'Tirzepatide' as const, amountMg: 7.5, date: '2026-05-08T12:00:00Z' },
    { medication: 'Semaglutide' as const, amountMg: 0.5, date: '2026-05-15T12:00:00Z' },
  ];
  it('uses the last dose of that drug, not the last dose overall', () => {
    expect(defaultDoseAmount('Tirzepatide', hist)).toBe(7.5);
    expect(defaultDoseAmount('Semaglutide', hist)).toBe(0.5);
  });
  it('falls back to the first standard step, or nothing', () => {
    expect(defaultDoseAmount('Tirzepatide', [])).toBe(2.5);
    expect(defaultDoseAmount('Semaglutide', [])).toBe(0.25);
    expect(defaultDoseAmount('Retatrutide', [])).toBeNull();
    expect(defaultDoseAmount('Other', hist)).toBeNull();
  });
});
