import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WeightVsTrialsChart, TRIAL_CURVES } from '../components/WeightVsTrialsChart';
import { seedStore } from './fixtures';

afterEach(cleanup);

describe('RV07: the reference line is labelled as an illustration', () => {
  it('the legend says "Illustrative reference interpolation", not "Clinical trial avg. loss", and shows a dashed swatch', () => {
    seedStore('populated', 'lbs');
    const { container } = render(<WeightVsTrialsChart />);
    expect(screen.getByText(/Illustrative reference interpolation \(Retatrutide\)/)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Clinical trial avg/);
    expect(container.querySelector('[data-testid="reference-swatch"]')).toHaveClass('border-dashed');
  });

  it('switching drug keeps the label and does not draw a range band', async () => {
    seedStore('populated', 'lbs');
    const user = userEvent.setup();
    const { container } = render(<WeightVsTrialsChart />);
    await user.selectOptions(screen.getByLabelText(/reference trial/i), 'Tirzepatide');
    expect(screen.getByText(/Illustrative reference interpolation \(Tirzepatide\)/)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Clinical trial avg/);
  });

  it('no curve invents a min/max band: each returns only an average', () => {
    for (const drug of ['Retatrutide', 'Tirzepatide', 'Semaglutide'] as const) {
      for (const days of [0, 90, 336, 500]) {
        expect(Object.keys(TRIAL_CURVES[drug].getExpectedPercentLoss(days))).toEqual(['avg']);
      }
    }
  });
});
