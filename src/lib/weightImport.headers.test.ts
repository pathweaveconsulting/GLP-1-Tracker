import { describe, it, expect } from 'vitest';
import { importWeightsCsv } from './weightImport';

const run = (header: string, value = '90', defaultUnit: 'lbs' | 'kg' = 'lbs') =>
  importWeightsCsv(`Date,${header}\n2026-03-01,${value}`, { existing: [], defaultUnit });

describe('RV05: units in joined and camel-case headers', () => {
  for (const h of ['WeightKg', 'weight_kg', 'WT-KG', 'weightkgs', 'weightkg', 'Weight (kg)', 'Body Weight KG', 'weight-kilograms', 'WeightKGs']) {
    it(`"${h}" is read as kilograms (90 -> about 198.4 lb)`, () => {
      const r = run(h);
      expect(r.errors).toEqual([]);
      expect(r.unit).toBe('kg');
      expect(r.unitSource).toBe('header');
      expect(r.rows[0].weightLbs).toBeCloseTo(90 * 2.2046226, 3);
    });
  }

  for (const h of ['WeightLbs', 'weight_lbs', 'WT-LB', 'weightlbs', 'Weight (lbs)', 'weightpounds']) {
    it(`"${h}" is read as pounds even when the fallback is kg`, () => {
      const r = run(h, '200', 'kg');
      expect(r.unit).toBe('lbs');
      expect(r.unitSource).toBe('header');
      expect(r.rows[0].weightLbs).toBe(200);
    });
  }

  it('does not read a unit out of unrelated words', () => {
    for (const h of ['Weight', 'Weight (problem)', 'Weight backgrounds', 'Weight kgsomething', 'Weight blob']) {
      expect(run(h, '200').unitSource, h).toBe('default');
    }
  });

  it('a header with no unit uses the fallback and says so in the summary data', () => {
    const r = run('Weight', '200', 'lbs');
    expect(r.unit).toBe('lbs');
    expect(r.unitSource).toBe('default');
  });

  it('"Weight (kg)" behaves as before', () => {
    const r = run('Weight (kg)', '82.5');
    expect(r.unit).toBe('kg');
    expect(r.rows[0].weightLbs).toBeCloseTo(82.5 * 2.2046226, 3);
  });
});
