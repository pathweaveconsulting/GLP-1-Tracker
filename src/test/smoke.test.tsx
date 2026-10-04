import { describe, it, expect } from 'vitest';
import { seedStore } from './fixtures';
import { open, ROUTES } from './helpers';

// No \b: textContent concatenates adjacent elements ("NaNWeekly"), so word boundaries hide real bugs.
const BAD = /NaN|Infinity|undefined|\[object Object\]/;

const MODES = [
  ['empty', 'lbs'], ['empty', 'kg'], ['populated', 'lbs'], ['populated', 'kg'],
] as const;

describe('smoke: every route renders sane content', () => {
  for (const path of ROUTES) {
    for (const [mode, unit] of MODES) {
      it(`${path} [${mode}, ${unit}]`, async () => {
        seedStore(mode, unit);
        await open(path);
        const main = document.querySelector('main')!;
        const heading = main.querySelector('h1, h2, h3');
        expect(heading, 'main has a heading').not.toBeNull();
        expect(heading!.textContent!.trim().length).toBeGreaterThan(2);
        const text = main.textContent ?? '';
        expect(text.trim().length).toBeGreaterThan(40);
        expect(text).not.toMatch(BAD);
      });
    }
  }
});
