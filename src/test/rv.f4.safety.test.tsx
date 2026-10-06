import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SafetyNotice } from '../components/SafetyNotice';
import { LEAFLET_LINE, MEDICATION_OPTIONS } from '../lib/medications';

afterEach(cleanup);

describe('F4: the missed-dose section has no stale "time windows" sentence and no repeated leaflet line', () => {
  for (const med of MEDICATION_OPTIONS) {
    it(`${med}`, () => {
      render(<MemoryRouter><SafetyNotice variant="full" medication={med} /></MemoryRouter>);
      const section = screen.getByText('If you miss a dose').parentElement as HTMLElement;
      expect(section.textContent).not.toMatch(/time windows/i);
      expect(within(section).queryByText(/windows are/i)).not.toBeInTheDocument();
      expect(section.textContent!.split(LEAFLET_LINE).length - 1, 'leaflet line appears exactly once').toBe(1);
    });
  }
});
