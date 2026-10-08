import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { seedStore, isoDaysAgo } from './fixtures';
import { open } from './helpers';
import { useStore } from '../store/useStore';

afterEach(cleanup);

const main = () => document.querySelector('main') as HTMLElement;
const row = (title: string) => within(screen.getByRole('region', { name: "Today's records" })).getByText(title).closest('li') as HTMLElement;

describe('redesign: navigation (master backlog Pack 4)', () => {
  it('desktop navigation lists the five primary destinations first, then secondary groups', async () => {
    seedStore('populated', 'lbs');
    await open('/');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    const names = within(nav).getAllByRole('link').map((a) => a.textContent);
    expect(names.slice(0, 5)).toEqual(['Today', 'Progress', 'Health', 'Medication', 'Insights']);
    expect(names).toEqual(expect.arrayContaining(['All history', 'Calendar', 'Reports', 'Guidance', 'Settings & data', 'This week', 'Health summary']));
  });

  it('the mobile tab bar has four destinations and a More button, never more than five items', async () => {
    seedStore('populated', 'lbs');
    await open('/');
    const bar = screen.getByRole('navigation', { name: 'Primary' });
    expect(within(bar).getAllByRole('link').map((a) => a.textContent)).toEqual(['Today', 'Progress', 'Health', 'Medication']);
    expect(within(bar).getByRole('button', { name: 'More' })).toBeInTheDocument();
    expect(within(bar).getAllByRole('listitem')).toHaveLength(5);
  });

  it('marks the current destination with aria-current, including its related pages', async () => {
    seedStore('populated', 'lbs');
    await open('/health');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Health' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Today' })).not.toHaveAttribute('aria-current');
    cleanup();
    await open('/');
    expect(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page');
  });

  it('More (mobile) opens a menu with Insights and every secondary destination', async () => {
    seedStore('populated', 'lbs');
    const user = userEvent.setup();
    await open('/weight');
    await user.click(within(screen.getByRole('navigation', { name: 'Primary' })).getByRole('button', { name: 'More' }));
    const menu = screen.getByRole('dialog', { name: 'Menu' });
    const names = within(menu).getAllByRole('link').map((a) => a.textContent);
    expect(names).toEqual(expect.arrayContaining(['Insights', 'All history', 'Calendar', 'This week', 'Reports', 'Guidance', 'Settings & data']));
    await user.click(within(menu).getByRole('link', { name: 'Insights' }));
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
  });
});

describe('redesign: Today (master backlog Pack 5)', () => {
  it('shows the local date, the medication and one h1 named Today', async () => {
    seedStore('populated', 'lbs');
    await open('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Today');
    expect(main().querySelector('time')).not.toBeNull();
    expect(main().textContent).toContain('Tirzepatide');
  });

  it("today's records say what was and was not recorded today, from the records alone", async () => {
    seedStore('populated', 'lbs'); // weight and symptoms recorded today; last injection yesterday
    await open('/');
    expect(row('Weight')).toHaveTextContent('Recorded today');
    expect(row('Check-in')).toHaveTextContent('Recorded today');
    expect(row('Injection')).toHaveTextContent('Not recorded today');
    expect(row('Injection')).toHaveTextContent('Last recorded yesterday');
  });

  it('a new record made from Today changes its row to recorded', async () => {
    seedStore('populated', 'lbs');
    useStore.setState({ weights: useStore.getState().weights.filter((w) => w.date !== isoDaysAgo(0)) });
    const user = userEvent.setup();
    await open('/');
    expect(row('Weight')).toHaveTextContent('Not recorded today');
    await user.click(screen.getByRole('button', { name: 'Record weight' }));
    const dialog = screen.getByRole('dialog', { name: /log weight/i });
    const input = within(dialog).getByLabelText(/weight \(lbs\)/i);
    await user.clear(input);
    await user.type(input, '199.5');
    await user.click(within(dialog).getByRole('button', { name: /save weight/i }));
    expect(row('Weight')).toHaveTextContent('Recorded today');
    expect(row('Weight')).toHaveTextContent('199.5 lbs');
  });

  it('empty records: nothing is invented, no percentages, no "normal" or "on track"', async () => {
    seedStore('empty', 'lbs');
    await open('/');
    const text = main().textContent!;
    expect(row('Injection')).toHaveTextContent('No injections recorded yet');
    expect(text).toContain('No injections recorded yet');
    expect(text).toContain('No check-in in the last 7 days');
    expect(text).not.toMatch(/\d%|normal|on track/i);
  });

  it('the latest check-in shows its date and each rating in words', async () => {
    seedStore('populated', 'lbs');
    await open('/');
    const panel = screen.getByRole('region', { name: 'Latest check-in' });
    expect(panel).toHaveTextContent(/Recorded \w{3} \d{1,2} \w{3} \(today\)/);
    for (const label of ['Hunger', 'Food noise', 'Nausea', 'Fatigue']) expect(within(panel).getByText(label)).toBeInTheDocument();
    expect(panel.textContent).toMatch(/None|Mild|Moderate|Severe|Not recorded/);
  });

  it('a rating that was not recorded says so instead of showing none', async () => {
    seedStore('empty', 'lbs');
    useStore.setState({ effects: [{ id: 'e', date: isoDaysAgo(0), hunger: 'mild', notes: '' }] });
    await open('/');
    const panel = screen.getByRole('region', { name: 'Latest check-in' });
    const nausea = within(panel).getByText('Nausea').closest('div') as HTMLElement;
    expect(nausea).toHaveTextContent('Not recorded');
    expect(within(panel).getByText('Hunger').closest('div')).toHaveTextContent('Mild');
  });

  it('protein & water appear only when that feature is on or already used', async () => {
    seedStore('populated', 'lbs');
    await open('/');
    expect(within(screen.getByRole('region', { name: "Today's records" })).queryByText('Protein & water')).not.toBeInTheDocument();
  });
});

describe('redesign: capabilities moved off the home screen are still available', () => {
  it('the estimated level chart and its explanation live on the Medication page', async () => {
    seedStore('populated', 'lbs');
    const user = userEvent.setup();
    await open('/doses');
    expect(main().textContent).toMatch(/Estimated Tirzepatide level now/);
    await user.click(screen.getAllByRole('button', { name: /about the estimated level/i })[0]);
    expect(screen.getByRole('dialog', { name: /about the estimated level/i })).toBeInTheDocument();
  });

  it('the weekly weight and injections chart lives on Progress, with a labelled range control', async () => {
    seedStore('populated', 'lbs');
    const user = userEvent.setup();
    await open('/weight');
    await user.click(screen.getByRole('button', { name: /weight log & table/i }));
    const panel = screen.getByRole('region', { name: 'Weight and injections by week' });
    const range = within(panel).getByRole('group', { name: 'Chart range' });
    expect(within(range).getByRole('button', { name: '8 weeks' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(range).getByRole('button', { name: '12 weeks' }));
    expect(within(range).getByRole('button', { name: '12 weeks' })).toHaveAttribute('aria-pressed', 'true');
  });
});
