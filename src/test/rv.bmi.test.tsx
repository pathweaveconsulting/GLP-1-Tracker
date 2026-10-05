import { describe, it, expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { bmiCategory, BMI_FOOTNOTE } from '../lib/units';
import { seedStore } from './fixtures';
import { open } from './helpers';

afterEach(cleanup);

describe('RV08: BMI labels are neutral and carry a screening footnote', () => {
  it('each band, including the exact boundaries', () => {
    expect(bmiCategory(null)).toBeNull();
    expect(bmiCategory(17)).toBe('Below healthy range'); // other category names are unchanged
    expect(bmiCategory(18.49)).toBe('Below healthy range');
    expect(bmiCategory(18.5)).toBe('18.5 to 24.9');
    expect(bmiCategory(22)).toBe('18.5 to 24.9');
    expect(bmiCategory(24.99)).toBe('18.5 to 24.9');
    expect(bmiCategory(25)).toBe('Overweight range');
    expect(bmiCategory(29.99)).toBe('Overweight range');
    expect(bmiCategory(30)).toBe('Obesity range');
    expect(bmiCategory(41)).toBe('Obesity range');
  });

  it('no label calls a range "Healthy range"', () => {
    for (const v of [10, 18.5, 22, 27, 35]) expect(bmiCategory(v)).not.toBe('Healthy range');
  });

  it('the footnote wording', () => {
    expect(BMI_FOOTNOTE).toBe('BMI is a screening measure, not a diagnosis, and is less reliable for some people.');
  });

  for (const path of ['/', '/results?tab=progress']) {
    it(`${path}: a visible footnote accompanies the BMI category`, async () => {
      seedStore('populated', 'lbs');
      await open(path);
      const main = document.querySelector('main')!.textContent!;
      expect(main).toMatch(/Overweight range|Obesity range|18\.5 to 24\.9|Below healthy range/);
      expect(main).toContain(BMI_FOOTNOTE);
    });
    it(`${path}: no category and no footnote without data`, async () => {
      seedStore('empty', 'lbs');
      await open(path);
      expect(document.querySelector('main')!.textContent).not.toContain(BMI_FOOTNOTE);
    });
  }
});
