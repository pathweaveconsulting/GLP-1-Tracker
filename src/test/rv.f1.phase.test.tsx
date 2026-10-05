import { describe, it, expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { seedStore } from './fixtures';
import { open } from './helpers';
import { NO_ESTIMATE_TEXT } from '../lib/medications';
import { useStore } from '../store/useStore';

afterEach(cleanup);

describe('F1: the home page shows no weekly phase text for a medication that is not modelled', () => {
  it('Retatrutide-only log: no "Day N of 7", the no-estimate text instead', async () => {
    seedStore('retatrutide', 'lbs');
    await open('/');
    const text = document.querySelector('main')!.textContent!;
    expect(text).not.toMatch(/Day \d of 7/);
    expect(text).toContain(NO_ESTIMATE_TEXT);
  });
  it('"Other" medication behaves the same', async () => {
    seedStore('populated', 'lbs');
    useStore.setState({ doses: useStore.getState().doses.map((d) => ({ ...d, medication: 'Other' as const })) });
    await open('/');
    expect(document.querySelector('main')!.textContent).not.toMatch(/Day \d of 7/);
  });
  it('Tirzepatide still shows its day count and phase', async () => {
    seedStore('populated', 'lbs');
    await open('/');
    expect(document.querySelector('main')!.textContent).toMatch(/Day \d of 7 • /);
  });
});

