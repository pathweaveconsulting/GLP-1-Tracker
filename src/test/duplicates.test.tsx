import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useStore } from '../store/useStore';
import { seedStore } from './fixtures';
import { LogWeightModal } from '../components/modals/LogWeightModal';
import { LogDoseModal } from '../components/modals/LogDoseModal';
import { similarDose, similarWeight } from '../lib/duplicates';
import { dateOnlyToIso, toLocalDateString } from '../lib/dates';
import type { DoseEvent, WeightEntry } from '../types';

afterEach(cleanup);

// Synthetic records only, placed in local time so every time zone sees the same days.
const at = (h: number, daysAgo = 0) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(h, 0, 0, 0); return d.toISOString(); };
const dose = (id: string, iso: string, amountMg = 5, medication: DoseEvent['medication'] = 'Tirzepatide'): DoseEvent => ({ id, medication, amountMg, date: iso, site: 'Thigh: Left', painLevel: null, notes: '' });
const today = () => toLocalDateString(new Date());

describe('duplicate rules', () => {
  it('a dose matches only the same medication and amount within 12 hours, and never itself', () => {
    const base = dose('a', at(8, 1));
    const list = [base];
    expect(similarDose(list, { ...base, date: new Date(new Date(base.date).getTime() + 11 * 3_600_000).toISOString() })).toBe(base);
    expect(similarDose(list, { ...base, date: new Date(new Date(base.date).getTime() + 13 * 3_600_000).toISOString() })).toBeUndefined();
    expect(similarDose(list, { ...base, amountMg: 7.5 })).toBeUndefined();
    expect(similarDose(list, { ...base, medication: 'Semaglutide' })).toBeUndefined();
    expect(similarDose(list, base, 'a')).toBeUndefined();
  });

  it('a weigh-in matches only the same local day within 0.5 lb, and never itself', () => {
    const w: WeightEntry = { id: 'w', weightLbs: 200, date: dateOnlyToIso(today()) };
    expect(similarWeight([w], { weightLbs: 200.5, date: w.date })).toBe(w);
    expect(similarWeight([w], { weightLbs: 200.6, date: w.date })).toBeUndefined();
    expect(similarWeight([w], { weightLbs: 200, date: at(12, 1) })).toBeUndefined();
    expect(similarWeight([w], w, 'w')).toBeUndefined();
  });
});

describe('logging warns about a possible duplicate but never blocks', () => {
  beforeEach(() => seedStore('empty', 'lbs'));

  it('weight: warns, saves nothing, then "Save anyway" saves; a clearly different value saves straight away', async () => {
    useStore.setState({ weights: [{ id: 'w', weightLbs: 200, date: dateOnlyToIso(today()) }] });
    const user = userEvent.setup();
    render(<LogWeightModal isOpen onClose={() => {}} />);
    const dialog = screen.getByRole('dialog', { name: /log weight/i });
    const input = within(dialog).getByLabelText(/weight \(lbs\)/i);
    await user.clear(input);
    await user.type(input, '200.2');
    await user.click(within(dialog).getByRole('button', { name: /save weight/i }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/You already have 200\.0 lbs recorded on .*If this is a separate weigh-in, select Save anyway/);
    expect(useStore.getState().weights).toHaveLength(1);
    await user.click(within(dialog).getByRole('button', { name: 'Save anyway' }));
    expect(useStore.getState().weights.map((w) => w.weightLbs)).toEqual([200, 200.2]);

    cleanup();
    render(<LogWeightModal isOpen onClose={() => {}} />);
    const again = screen.getByRole('dialog', { name: /log weight/i });
    const field = within(again).getByLabelText(/weight \(lbs\)/i);
    await user.clear(field);
    await user.type(field, '205');
    await user.click(within(again).getByRole('button', { name: /save weight/i }));
    expect(useStore.getState().weights).toHaveLength(3);
  });

  it('dose: warns for the same dose two hours later; changing the amount clears the warning', async () => {
    useStore.setState({ doses: [dose('d', new Date(Date.now() - 2 * 3_600_000).toISOString())] });
    const user = userEvent.setup();
    render(<LogDoseModal isOpen onClose={() => {}} />);
    const dialog = screen.getByRole('dialog', { name: /log shot/i });
    const amount = within(dialog).getByLabelText('Dose amount (mg)');
    await user.clear(amount);
    await user.type(amount, '5');
    await user.click(within(dialog).getByRole('button', { name: /save dose/i }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/You already recorded 5 mg Tirzepatide on .* at .*If this is a separate injection, select Save anyway/);
    expect(useStore.getState().doses).toHaveLength(1);
    await user.click(within(dialog).getByRole('button', { name: '7.5 mg' }));
    expect(within(dialog).queryByText(/You already recorded/)).toBeNull();
    expect(within(dialog).getByRole('button', { name: /save dose/i })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /save dose/i }));
    expect(useStore.getState().doses.map((d) => d.amountMg)).toEqual([5, 7.5]);
  });

  it('editing: moving a dose next to an identical one warns; correcting only its notes does not', async () => {
    const first = dose('a', at(9, 3));
    const second = dose('b', at(9, 2));
    useStore.setState({ doses: [first, second] });
    const user = userEvent.setup();
    render(<LogDoseModal isOpen entry={second} onClose={() => {}} />);
    let dialog = screen.getByRole('dialog', { name: 'Edit injection' });
    await user.type(within(dialog).getByLabelText(/Notes/), 'Corrected');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(useStore.getState().doses[1].notes).toBe('Corrected');

    cleanup();
    const current = useStore.getState().doses[1];
    render(<LogDoseModal isOpen entry={current} onClose={() => {}} />);
    dialog = screen.getByRole('dialog', { name: 'Edit injection' });
    const day = within(dialog).getByLabelText('Date');
    await user.clear(day);
    await user.type(day, toLocalDateString(new Date(first.date)));
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/You already recorded 5 mg Tirzepatide/);
    expect(useStore.getState().doses[1]).toEqual(current);
    await user.click(within(dialog).getByRole('button', { name: 'Save anyway' }));
    expect(useStore.getState().doses[1].date).not.toBe(current.date);
  });
});
