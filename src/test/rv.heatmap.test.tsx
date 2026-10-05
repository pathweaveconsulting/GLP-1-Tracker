import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { format, subDays } from 'date-fns';
import { AnalyticsHeatmaps } from '../components/AnalyticsHeatmaps';
import { useStore } from '../store/useStore';

afterEach(cleanup);

const noon = (daysAgo: number) => { const d = subDays(new Date(), daysAgo); d.setHours(12, 0, 0, 0); return d.toISOString(); };
const dose = (daysAgo: number, id = 'd') => ({ id: `${id}${daysAgo}`, medication: 'Tirzepatide' as const, amountMg: 5, date: noon(daysAgo), site: 'x', painLevel: 0, notes: '' });
const weight = (daysAgo: number, lbs: number) => ({ id: `w${daysAgo}`, weightLbs: lbs, date: noon(daysAgo) });

function seed(data: Partial<ReturnType<typeof useStore.getState>>) {
  useStore.setState({ weights: [], doses: [], effects: [], settings: { ...useStore.getState().settings, weightUnit: 'lbs' }, ...data });
}
const dayLabel = (daysAgo: number) => format(subDays(new Date(), daysAgo), 'MMM d, yyyy');

describe('RV06: each recorded entry is counted once', () => {
  beforeEach(() => seed({ weights: [weight(0, 200)], doses: [dose(0)] }));

  it('one weight plus one dose on a day is "2 entries", in the tooltip and in the data table', () => {
    const { container } = render(<AnalyticsHeatmaps />);
    const cell = container.querySelector(`[title="${dayLabel(0)}: 2 entries (weight, dose and symptom logs)"]`);
    expect(cell).not.toBeNull();
    const table = screen.getByRole('table', { name: /logging activity/i });
    const row = within(table).getByText(dayLabel(0)).closest('tr') as HTMLElement;
    expect(row).toHaveTextContent('2 entries');
  });

  it('a single entry says "1 entry", and a day with nothing is not listed', () => {
    seed({ doses: [dose(1)] });
    const { container } = render(<AnalyticsHeatmaps />);
    expect(container.querySelector(`[title="${dayLabel(1)}: 1 entry (weight, dose and symptom logs)"]`)).not.toBeNull();
    const table = screen.getByRole('table', { name: /logging activity/i });
    expect(within(table).queryByText(dayLabel(2))).not.toBeInTheDocument();
  });

  it('the weight grid caption says "vs. the previous recorded weigh-in"', () => {
    render(<AnalyticsHeatmaps />);
    expect(screen.getByText(/vs\. the previous recorded weigh-in/)).toBeInTheDocument();
    expect(screen.queryByText(/vs\. previous day/)).not.toBeInTheDocument();
  });
});

describe('RV07: the grids can be read without colour or hover', () => {
  beforeEach(() => seed({ weights: [weight(10, 200), weight(5, 198.5), weight(0, 199)], doses: [dose(0), dose(5)] }));

  it('cells are decorative (aria-hidden) and never tab stops', () => {
    const { container } = render(<AnalyticsHeatmaps />);
    const cells = container.querySelectorAll('[title]');
    expect(cells.length).toBeGreaterThan(200);
    for (const c of cells) {
      expect(c).toHaveAttribute('aria-hidden', 'true');
      expect(c).not.toHaveAttribute('tabindex');
    }
    expect(container.querySelectorAll('[tabindex]').length).toBe(0);
  });

  it('each grid is a labelled group with a one-sentence summary and a collapsed data table', () => {
    render(<AnalyticsHeatmaps />);
    for (const name of [/weight change/i, /logging activity/i]) {
      const group = screen.getByRole('group', { name });
      expect(group).toHaveAccessibleDescription(/.+/);
    }
    expect(screen.getByRole('group', { name: /weight change/i })).toHaveAccessibleDescription(/3 weigh-ins/);
    expect(screen.getByRole('group', { name: /logging activity/i })).toHaveAccessibleDescription(/5 entries/);
    const details = document.querySelectorAll('details');
    expect(details.length).toBe(2);
    for (const d of details) expect(d.open).toBe(false);
  });

  it('the weight table lists date and signed change; the first weigh-in has no comparison', () => {
    render(<AnalyticsHeatmaps />);
    const table = screen.getByRole('table', { name: /weight change/i });
    const rows = within(table).getAllByRole('row').slice(1).map((r) => r.textContent);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain(dayLabel(10));
    expect(rows[0]).toMatch(/first weigh-in/i);
    expect(rows[1]).toContain('-1.5 lbs');
    expect(rows[2]).toContain('+0.5 lbs');
  });

  it('cells carry a visible cue: the count for activity, a direction mark for weight', () => {
    const { container } = render(<AnalyticsHeatmaps />);
    const act = container.querySelector(`[title="${dayLabel(0)}: 2 entries (weight, dose and symptom logs)"]`) as HTMLElement;
    expect(act.textContent).toBe('2');
    const down = container.querySelector(`[title^="${dayLabel(5)}:"]`) as HTMLElement;
    expect(down.textContent).toBe('▼');
    const up = [...container.querySelectorAll(`[title^="${dayLabel(0)}:"]`)].find((e) => /higher/.test(e.getAttribute('title')!)) as HTMLElement;
    expect(up.textContent).toBe('▲');
  });
});
