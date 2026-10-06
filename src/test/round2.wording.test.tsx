import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SafetyNotice } from '../components/SafetyNotice';
import { doseWarning, APPROXIMATE_NOTE, LEAFLET_LINE, MEDICATION_INFO } from '../lib/medications';
import { seedStore } from './fixtures';
import { open } from './helpers';

afterEach(cleanup);

describe('R13: approximate values say so, and missed-dose windows point to the leaflet', () => {
  it('the shared wording is the exact phrases requested', () => {
    expect(APPROXIMATE_NOTE).toBe('approximate; verify against current prescribing information');
    expect(LEAFLET_LINE).toBe('Check your leaflet or ask your pharmacist.');
  });

  for (const med of ['Tirzepatide', 'Semaglutide'] as const) {
    it(`${med}: the missed-dose text includes the leaflet line (no time windows remain, so no "approximate" marker is needed; F4)`, () => {
      render(<MemoryRouter><SafetyNotice variant="full" medication={med} /></MemoryRouter>);
      const section = screen.getByText('If you miss a dose').parentElement as HTMLElement;
      expect(within(section).getByText(MEDICATION_INFO[med].missedDoseNote, { exact: false })).toBeInTheDocument();
      expect(section.textContent).toContain(LEAFLET_LINE);
    });
  }

  it('every medication shows the leaflet line under "If you miss a dose"', () => {
    for (const med of ['Retatrutide', 'Other'] as const) {
      const { unmount } = render(<MemoryRouter><SafetyNotice variant="full" medication={med} /></MemoryRouter>);
      expect((screen.getByText('If you miss a dose').parentElement as HTMLElement).textContent).toContain(LEAFLET_LINE);
      unmount();
    }
  });

  it('the usual-maximum and usual-steps warnings carry the approximate note, with the same numbers', () => {
    const max = doseWarning('Tirzepatide', 20)!;
    expect(max.text).toMatch(/above the usual maximum of 15 mg/);
    expect(max.text).toContain(APPROXIMATE_NOTE);
    const step = doseWarning('Semaglutide', 1.2)!;
    expect(step.text).toMatch(/usual Semaglutide steps \(0\.25, 0\.5, 1, 1\.7, 2, 2\.4 mg\)/);
    expect(step.text).toContain(APPROXIMATE_NOTE);
    expect(doseWarning('Tirzepatide', 5)).toBeNull();
  });

  it('the dose form marks the standard-step buttons as approximate', async () => {
    seedStore('empty', 'lbs');
    const user = userEvent.setup();
    await open('/doses');
    await user.click(screen.getByRole('button', { name: /record injection/i }));
    const dialog = screen.getByRole('dialog', { name: /log shot/i });
    const steps = within(dialog).getByRole('group', { name: /standard .* dose steps/i }).parentElement as HTMLElement;
    expect(steps.textContent).toContain(APPROXIMATE_NOTE);
  });
});
