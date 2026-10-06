import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { seedStore } from './fixtures';
import { open } from './helpers';
import { useStore } from '../store/useStore';
import { isoToLocalDateString, todayLocalDateString } from '../lib/dates';

describe('log modals keep the chosen calendar day (any timezone)', () => {
  it('weight: typed date is the stored local day; default is today', async () => {
    seedStore('empty', 'lbs');
    const user = userEvent.setup();
    await open('/weight');
    await user.click(screen.getByRole('button', { name: /record weight/i }));
    const dialog = screen.getByRole('dialog', { name: /log weight/i });
    expect(within(dialog).getByLabelText(/^date/i)).toHaveValue(todayLocalDateString());
    const date = within(dialog).getByLabelText(/^date/i);
    await user.clear(date);
    await user.type(date, '2026-03-05');
    const w = within(dialog).getByLabelText(/weight \(lbs\)/i);
    await user.clear(w);
    await user.type(w, '200');
    await user.click(within(dialog).getByRole('button', { name: /save weight/i }));
    expect(isoToLocalDateString(useStore.getState().weights[0].date)).toBe('2026-03-05');
  });

  it('weight: rejects a future date', async () => {
    seedStore('empty', 'lbs');
    const user = userEvent.setup();
    await open('/weight');
    await user.click(screen.getByRole('button', { name: /record weight/i }));
    const dialog = screen.getByRole('dialog', { name: /log weight/i });
    const date = within(dialog).getByLabelText(/^date/i);
    await user.clear(date);
    await user.type(date, '2999-01-01');
    const w = within(dialog).getByLabelText(/weight \(lbs\)/i);
    await user.clear(w);
    await user.type(w, '200');
    await user.click(within(dialog).getByRole('button', { name: /save weight/i }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/not in the future/);
    expect(useStore.getState().weights).toHaveLength(0);
  });

  it('symptoms: typed date is the stored local day, nothing is pre-selected, and appetite suppression starts at none', async () => {
    seedStore('empty', 'lbs');
    const user = userEvent.setup();
    await open('/effects');
    await user.click(screen.getByRole('button', { name: /record symptoms/i }));
    const dialog = screen.getByRole('dialog', { name: /log how you feel/i });
    const date = within(dialog).getByLabelText(/^date/i);
    await user.clear(date);
    await user.type(date, '2026-03-05');
    await user.click(within(dialog).getByRole('button', { name: /save log/i }));
    const e = useStore.getState().effects[0];
    expect(isoToLocalDateString(e.date)).toBe('2026-03-05');
    expect(e.appetiteLoss).toBe('none'); // used to default to "mild" without the user choosing it
    expect(e.hunger).toBe('none');
  });
});
