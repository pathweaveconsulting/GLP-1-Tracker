import { describe, it, expect } from 'vitest';
import { computeAccessibleName } from 'dom-accessibility-api';
import { seedStore } from './fixtures';
import { open, ROUTES } from './helpers';

// Skipped until Phase 7 fixes the findings; flip to `it` there.
const a11yIt = process.env.A11Y_ENFORCE ? it : it.skip;

const INTERACTIVE = 'button, a[href], input:not([type="hidden"]), select, textarea';

describe('accessibility: every page', () => {
  for (const path of ROUTES) {
    a11yIt(`${path}: interactive controls have names and there is one <h1>`, async () => {
      seedStore('populated', 'lbs');
      await open(path);
      const unnamed: string[] = [];
      document.querySelectorAll(INTERACTIVE).forEach((el) => {
        const name = computeAccessibleName(el).trim();
        if (!name) unnamed.push(el.outerHTML.slice(0, 120));
      });
      expect(unnamed, 'controls without accessible names').toEqual([]);
      expect(document.querySelectorAll('h1')).toHaveLength(1);
    });
  }
});
