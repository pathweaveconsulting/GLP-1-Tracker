import { describe, it, expect } from 'vitest';
import { MEDICATION_INFO, MEDICATION_OPTIONS, MISSED_DOSE_NOTE } from '../lib/medications';

describe('F3: every missed-dose note is pinned to its exact wording', () => {
  const EXPECTED: Record<string, string> = {
    Tirzepatide: MISSED_DOSE_NOTE,
    Semaglutide: MISSED_DOSE_NOTE,
    Retatrutide: 'Retatrutide is investigational, so there is no approved missed-dose guidance. Follow the instructions from your study team or prescriber, and never take two doses to catch up.',
    Other: 'Follow the missed-dose instructions that came with your medication or ask your prescriber or pharmacist. Never take two doses to catch up.',
  };
  it('each medication has exactly the intended note (a deleted, emptied or reworded note fails)', () => {
    expect(Object.keys(EXPECTED).sort()).toEqual([...MEDICATION_OPTIONS].sort());
    for (const m of MEDICATION_OPTIONS) expect(MEDICATION_INFO[m].missedDoseNote, m).toBe(EXPECTED[m]);
  });
  it('the shared note is the requested sentence', () => {
    expect(MISSED_DOSE_NOTE).toBe('Missed-dose instructions depend on your exact product. Check your leaflet or ask your pharmacist. This app does not tell you to take a late or extra dose.');
  });
  it('no note carries a time window or permission to dose late', () => {
    for (const m of MEDICATION_OPTIONS) expect(MEDICATION_INFO[m].missedDoseNote, m).not.toMatch(/\d\s*(days?|hours?)|can be taken|you can take|whenever|within/i);
  });
});

