import { describe, it, expect } from 'vitest';
import { bmi, bmiCategory, displayToLbs, formatHeight, formatWeight, formatWeightChange, getWeightUnit, lbsToDisplay, WEIGHT_BOUNDS } from './units';
import { validateProfile } from './profile';

describe('conversions', () => {
  it('defaults to lbs unless kg is chosen', () => {
    expect(getWeightUnit(undefined)).toBe('lbs');
    expect(getWeightUnit({})).toBe('lbs');
    expect(getWeightUnit({ weightUnit: 'kg' })).toBe('kg');
  });
  it('converts known values', () => {
    expect(displayToLbs(100, 'kg')).toBeCloseTo(220.462, 3);
    expect(lbsToDisplay(220.462, 'kg')).toBe(100);
    expect(lbsToDisplay(180.26, 'lbs')).toBe(180.3);
    expect(displayToLbs(180, 'lbs')).toBe(180);
  });
  it('round-trips a typed kg value through pound storage without drifting', () => {
    for (let kg = 30; kg <= 300; kg += 0.1) {
      const typed = Math.round(kg * 10) / 10;
      expect(lbsToDisplay(displayToLbs(typed, 'kg'), 'kg')).toBe(typed);
    }
  });
  it('round-trips lbs too', () => {
    for (let lbs = 70; lbs <= 600; lbs += 0.1) {
      const typed = Math.round(lbs * 10) / 10;
      expect(lbsToDisplay(displayToLbs(typed, 'lbs'), 'lbs')).toBe(typed);
    }
  });
  it('has bounds that line up across units', () => {
    expect(displayToLbs(WEIGHT_BOUNDS.kg.min, 'kg')).toBeGreaterThanOrEqual(WEIGHT_BOUNDS.lbs.min);
    expect(displayToLbs(WEIGHT_BOUNDS.kg.max, 'kg')).toBeLessThanOrEqual(WEIGHT_BOUNDS.lbs.max);
  });
});

describe('formatting', () => {
  it('formats weights, changes and missing values', () => {
    expect(formatWeight(220.462, 'kg')).toBe('100.0 kg');
    expect(formatWeight(180, 'lbs', { unit: false })).toBe('180.0');
    expect(formatWeight(null, 'lbs')).toBe('–');
    expect(formatWeight(Number.NaN, 'lbs')).toBe('–');
    expect(formatWeightChange(-2.2046226, 'kg')).toBe('-1.0 kg');
    expect(formatWeightChange(1.26, 'lbs')).toBe('+1.3 lbs');
    expect(formatWeightChange(0.01, 'lbs')).toBe('0.0 lbs');
    expect(formatWeightChange(undefined, 'lbs')).toBe('–');
  });
  it('formats height and rejects zero', () => {
    expect(formatHeight(68)).toBe(`5'8"`);
    expect(formatHeight(72)).toBe(`6'0"`);
    expect(formatHeight(0)).toBe('–');
    expect(formatHeight(undefined)).toBe('–');
  });
});

describe('bmi', () => {
  it('computes from pounds and inches and never returns Infinity or NaN', () => {
    expect(bmi(180, 68)).toBeCloseTo(27.37, 2);
    expect(bmi(180, 0)).toBeNull();
    expect(bmi(0, 68)).toBeNull();
    expect(bmi(null, 68)).toBeNull();
    expect(bmi(180, undefined)).toBeNull();
  });
  it('names the category from the computed value', () => {
    expect(bmiCategory(17)).toBe('Below 18.5'); // neutral numeric, no "healthy" (F9)
    expect(bmiCategory(22)).toBe('18.5 to 24.9'); // neutral numeric range, not "Healthy range" (RV08)
    expect(bmiCategory(27.4)).toBe('Overweight range');
    expect(bmiCategory(34)).toBe('Obesity range');
    expect(bmiCategory(null)).toBeNull();
  });
});

describe('validateProfile', () => {
  const base = { medication: 'Tirzepatide' as const, unit: 'kg' as const, startingWeight: '100', goalWeight: '80', heightFt: '5', heightIn: '8', startDate: '2026-01-05' };
  it('stores kg input as pounds and height as inches', () => {
    const r = validateProfile(base, '2026-06-01');
    expect(r.errors).toEqual({});
    expect(r.value!.startingWeight).toBeCloseTo(220.462, 3);
    expect(r.value!.targetWeight).toBeCloseTo(176.37, 2);
    expect(r.value!.heightInches).toBe(68);
    expect(r.value!.weightUnit).toBe('kg');
  });
  it('applies the bounds of the selected unit', () => {
    expect(validateProfile({ ...base, startingWeight: '400' }, '2026-06-01').errors.startingWeight).toMatch(/between 23 and 362 kg/);
    expect(validateProfile({ ...base, unit: 'lbs', startingWeight: '400' }, '2026-06-01').errors.startingWeight).toBeUndefined();
  });
  it('rejects blanks, future dates and bad heights with readable messages', () => {
    const r = validateProfile({ ...base, startingWeight: '', goalWeight: 'abc', heightFt: '', heightIn: '14', startDate: '2026-07-01' }, '2026-06-01');
    expect(Object.keys(r.errors).sort()).toEqual(['goalWeight', 'heightFt', 'heightIn', 'startDate', 'startingWeight']);
    expect(r.value).toBeUndefined();
  });
});
