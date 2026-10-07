import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { seedStore } from './fixtures';
import { open, ROUTES } from './helpers';
import { useStore } from '../store/useStore';

// Strings that used to be hard-coded for every user regardless of their data.
const FABRICATED = /Renu|Premium Plan|Normal and Expected|Mounjaro 7\.5|4\.75|Nov 2026|-10% Body Weight|resting heart rate|lean mass|AI Coach|glapp/i;
// With no logs at all, no weight figure can legitimately appear.
const FABRICATED_WHEN_EMPTY = /-1\.2 lbs|-1\.4|1\.5 lbs/;

describe('no fabricated content', () => {
  for (const path of ROUTES) {
    it(`${path} shows no canned values or external images (empty data)`, async () => {
      seedStore('empty', 'lbs');
      await open(path);
      expect(document.body.textContent).not.toMatch(FABRICATED);
      expect(document.body.textContent).not.toMatch(FABRICATED_WHEN_EMPTY);
      document.querySelectorAll('img').forEach((img) => expect(img.getAttribute('src') ?? '').not.toMatch(/^https?:/));
    });
    it(`${path} shows no canned values (populated data)`, async () => {
      seedStore('populated', 'lbs');
      await open(path);
      expect(document.body.textContent).not.toMatch(FABRICATED);
    });
  }
});

describe('honest empty states', () => {
  it('Overview shows dashes, not made-up weight, pace, BMI or dose', async () => {
    seedStore('empty', 'lbs');
    await open('/');
    const main = document.querySelector('main')!;
    expect(main.textContent).toContain('No weigh-ins yet');
    expect(main.textContent).toContain('Needs 3+ weigh-ins over 2+ weeks');
    expect(main.textContent).not.toMatch(/\b(220|185|7\.5 mg|Overweight)\b/);
  });

  it('This Week asks for a symptom log instead of inventing appetite and food noise scores', async () => {
    seedStore('empty', 'lbs');
    await open('/this-week');
    expect(screen.getByText(/No symptom log in the last 3 days/)).toBeInTheDocument();
    expect(document.querySelector('main')!.textContent).not.toMatch(/\d\/10|78%/);
    expect(screen.getAllByText(/Illustrative/).length).toBeGreaterThan(0);
  });

  it('Journey refuses a goal date without enough weigh-ins', async () => {
    seedStore('empty', 'lbs');
    useStore.setState({ weights: [{ id: 'one', date: new Date().toISOString(), weightLbs: 200 }] });
    await open('/results?tab=journey');
    expect(screen.getAllByText(/Needs 3\+ weigh-ins over 2\+ weeks/).length).toBeGreaterThan(0);
  });

  it('Recommendations labels sources and the "Read more" control really expands', async () => {
    seedStore('populated', 'lbs');
    const user = userEvent.setup();
    await open('/recommendations');
    expect(screen.getAllByText('From your logs').length).toBeGreaterThan(0);
    expect(screen.getAllByText('General').length).toBeGreaterThan(0);
    const btn = screen.getAllByRole('button', { name: /read more/i })[0];
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    await user.click(btn);
    expect(screen.getAllByRole('button', { name: /show less/i })[0]).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('Reports', () => {
  it('navigates between periods and shows an empty state when nothing was logged', async () => {
    seedStore('populated', 'lbs');
    const user = userEvent.setup();
    await open('/reports');
    // Select the live report period; the app now also has a backup reminder heading.
    const heading = () => screen.getAllByRole('heading', { level: 2 }).find(h => h.getAttribute('aria-live') === 'polite')!.textContent;
    const first = heading();
    expect(screen.getByRole('button', { name: /next week/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /previous week/i }));
    expect(heading()).not.toBe(first);
    await user.click(screen.getByRole('button', { name: /^monthly$/i }));
    expect(screen.getByRole('button', { name: /^monthly$/i })).toHaveAttribute('aria-pressed', 'true');
    for (let i = 0; i < 6; i++) await user.click(screen.getByRole('button', { name: /previous month/i }));
    expect(screen.getByText(/Nothing was logged in this month/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument();
  });
});

describe('Notifications', () => {
  it('shows an empty state with no data and real, computed items with data', async () => {
    const user = userEvent.setup();
    seedStore('empty', 'lbs');
    await open('/');
    await user.click(screen.getByRole('button', { name: /^notifications/i }));
    const dialog = screen.getByRole('dialog', { name: /notifications/i });
    expect(within(dialog).getByText(/Nothing needs your attention/)).toBeInTheDocument();
  });
});
