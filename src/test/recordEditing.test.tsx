import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useStore } from '../store/useStore';
import { seedStore, isoDaysAgo } from './fixtures';
import { Doses } from '../pages/Doses';
import { Weight } from '../pages/Weight';
import { AllLogs } from '../pages/AllLogs';
import { ToastProvider } from '../components/ui/Toast';
import { isoToLocalDateString } from '../lib/dates';
import type { DoseEvent, WeightEntry } from '../types';

afterEach(cleanup);

// Synthetic records only. Seconds and long decimals make any rounding or re-timing visible.
const dose: DoseEvent = { id: 'dose-1', medication: 'Tirzepatide', amountMg: 5, date: '2026-09-01T08:15:37.123Z', site: 'Thigh: Left', painLevel: null, notes: 'Original note' };
const other: DoseEvent = { id: 'dose-2', medication: 'Tirzepatide', amountMg: 7.5, date: '2026-09-08T08:00:00.000Z', site: 'Abdomen: Lower Mid', painLevel: 2, notes: '' };
const weight: WeightEntry = { id: 'w-1', weightLbs: 220.00012345, date: new Date(2026, 8, 2, 9, 45, 12).toISOString() }; // local time, so the day is the same in every time zone
const weight2: WeightEntry = { id: 'w-2', weightLbs: 218, date: '2026-09-09T12:00:00.000Z' };

beforeEach(() => {
  seedStore('empty', 'kg');
  useStore.setState({ doses: [structuredClone(dose), structuredClone(other)], weights: [structuredClone(weight), structuredClone(weight2)] });
});

const showDoses = () => render(<ToastProvider><Doses /></ToastProvider>);
function showWeights() {
  render(<ToastProvider><Weight /></ToastProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Weight Log & Table' }));
}
const editDoseDialog = () => {
  fireEvent.click(screen.getByRole('button', { name: /Edit 5 mg injection from/ }));
  return screen.getByRole('dialog', { name: 'Edit injection' });
};
const editWeightDialog = () => {
  fireEvent.click(screen.getByRole('button', { name: /Edit weight entry from Sep 2, 2026/ }));
  return screen.getByRole('dialog', { name: 'Edit weight' });
};

describe('store: stale-safe edits', () => {
  it('replaces in place, keeping ID, position, key order and fields the form does not know about', () => {
    const legacy = { ...dose, source: 'import' } as DoseEvent;
    useStore.setState({ doses: [legacy, other] });
    const { id: _id, ...fields } = legacy;
    expect(useStore.getState().editDose(legacy, { ...fields, notes: 'Changed' })).toBe(true);
    const [first, second] = useStore.getState().doses;
    expect(first).toEqual({ ...legacy, notes: 'Changed' });
    expect(Object.keys(first)).toEqual(Object.keys(legacy));
    expect(second).toEqual(other);
  });

  it('refuses when the record changed or is gone, and changes nothing', () => {
    const { id: _id, ...fields } = weight;
    const stale = { ...weight, weightLbs: 1 };
    expect(useStore.getState().editWeight(stale, { ...fields, weightLbs: 200 })).toBe(false);
    useStore.setState({ weights: [weight2] });
    expect(useStore.getState().editWeight(weight, { ...fields, weightLbs: 200 })).toBe(false);
    expect(useStore.getState().weights).toEqual([weight2]);
  });
});

describe('editing a weigh-in', () => {
  it('opening and saving without changes writes nothing', () => {
    showWeights();
    const before = useStore.getState().weights;
    fireEvent.click(within(editWeightDialog()).getByRole('button', { name: 'Save changes' }));
    expect(useStore.getState().weights).toBe(before);
    expect(screen.queryByText('Weight entry updated.')).toBeNull();
  });

  it('changing only the day keeps the exact stored pounds; changing only the weight keeps the exact time', async () => {
    const user = userEvent.setup();
    showWeights();
    let dialog = editWeightDialog();
    expect(within(dialog).getByLabelText('Weight (kg)')).toHaveValue(99.8);
    const day = within(dialog).getByLabelText('Date');
    await user.clear(day);
    await user.type(day, '2026-09-03');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    let saved = useStore.getState().weights[0];
    expect(saved).toMatchObject({ id: 'w-1', weightLbs: 220.00012345 });
    expect(isoToLocalDateString(saved.date)).toBe('2026-09-03');

    fireEvent.click(screen.getByRole('button', { name: /Edit weight entry from Sep 3, 2026/ }));
    dialog = screen.getByRole('dialog', { name: 'Edit weight' });
    const kg = within(dialog).getByLabelText('Weight (kg)');
    await user.clear(kg);
    await user.type(kg, '99.5');
    const dateBefore = useStore.getState().weights[0].date;
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    saved = useStore.getState().weights[0];
    expect(saved.date).toBe(dateBefore);
    expect(saved.weightLbs).toBeCloseTo(219.36, 1);
    expect(useStore.getState().weights).toHaveLength(2);
  });

  it('a weigh-in changed elsewhere while the dialog was open is not overwritten', async () => {
    const user = userEvent.setup();
    showWeights();
    const dialog = editWeightDialog();
    act(() => useStore.getState().updateWeight('w-1', { weightLbs: 215 }));
    const kg = within(dialog).getByLabelText('Weight (kg)');
    await user.clear(kg);
    await user.type(kg, '90');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/changed or was removed after you opened it\. Nothing was saved/);
    expect(useStore.getState().weights[0].weightLbs).toBe(215);
  });

  it('undo last edit restores the exact original; it refuses if the record changed again', async () => {
    const user = userEvent.setup();
    showWeights();
    let dialog = editWeightDialog();
    let kg = within(dialog).getByLabelText('Weight (kg)');
    await user.clear(kg);
    await user.type(kg, '95');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(screen.getByText(/Weight entry updated\./)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo last edit' }));
    expect(useStore.getState().weights).toEqual([weight, weight2]);

    dialog = editWeightDialog();
    kg = within(dialog).getByLabelText('Weight (kg)');
    await user.clear(kg);
    await user.type(kg, '95');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    act(() => useStore.getState().updateWeight('w-1', { weightLbs: 200 }));
    await user.click(screen.getByRole('button', { name: 'Undo last edit' }));
    expect(useStore.getState().weights[0].weightLbs).toBe(200);
    expect(screen.getByText(/Could not undo: this record changed again/)).toBeInTheDocument();
  });
});

describe('editing an injection', () => {
  it('starts from the stored record and keeps exact time, missing discomfort and identity when only notes change', async () => {
    const user = userEvent.setup();
    showDoses();
    const dialog = editDoseDialog();
    expect(within(dialog).getByLabelText('Dose amount (mg)')).toHaveValue(5);
    expect(within(dialog).getByLabelText(/discomfort/i)).toHaveValue('');
    const notes = within(dialog).getByLabelText(/Notes/);
    await user.clear(notes);
    await user.type(notes, 'Corrected note');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(useStore.getState().doses).toEqual([{ ...dose, notes: 'Corrected note' }, other]);
  });

  it('changing the time re-times the dose; a future time is refused', async () => {
    const user = userEvent.setup();
    showDoses();
    const dialog = editDoseDialog();
    const day = within(dialog).getByLabelText('Date');
    await user.clear(day);
    await user.type(day, isoDaysAgo(-2).slice(0, 10));
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(useStore.getState().doses[0]).toEqual(dose);
    await user.clear(day);
    await user.type(day, '2026-09-02');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    const saved = useStore.getState().doses[0];
    expect(saved.id).toBe('dose-1');
    expect(isoToLocalDateString(saved.date)).toBe('2026-09-02');
  });

  it('raising the amount above the usual maximum needs the double-check; an unchanged saved amount does not', async () => {
    const user = userEvent.setup();
    useStore.setState({ doses: [{ ...dose, amountMg: 20 }, other] });
    showDoses();
    fireEvent.click(screen.getByRole('button', { name: /Edit 20 mg injection from/ }));
    let dialog = screen.getByRole('dialog', { name: 'Edit injection' });
    const notes = within(dialog).getByLabelText(/Notes/);
    await user.type(notes, ' again');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(useStore.getState().doses[0]).toMatchObject({ amountMg: 20, notes: 'Original note again' });

    fireEvent.click(screen.getByRole('button', { name: /Edit 7.5 mg injection from/ }));
    dialog = screen.getByRole('dialog', { name: 'Edit injection' });
    const amount = within(dialog).getByLabelText('Dose amount (mg)');
    await user.clear(amount);
    await user.type(amount, '25');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(within(dialog).getByText(/Please confirm you’ve double-checked/)).toBeInTheDocument();
    expect(useStore.getState().doses[1]).toEqual(other);
    await user.click(within(dialog).getByRole('checkbox', { name: /double-checked/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(useStore.getState().doses[1]).toEqual({ ...other, amountMg: 25 });
  });

  it('a dose deleted while its edit dialog was open is not recreated', async () => {
    const user = userEvent.setup();
    showDoses();
    const dialog = editDoseDialog();
    act(() => useStore.getState().deleteDose('dose-1'));
    await user.type(within(dialog).getByLabelText(/Notes/), '!');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/Nothing was saved/);
    expect(useStore.getState().doses).toEqual([other]);
  });

  it('All history offers the same editing, and undo restores the exact injection', async () => {
    const user = userEvent.setup();
    render(<ToastProvider><AllLogs /></ToastProvider>);
    fireEvent.click(screen.getByRole('button', { name: /Edit 5 mg dose from/ }));
    const dialog = screen.getByRole('dialog', { name: 'Edit injection' });
    await user.selectOptions(within(dialog).getByLabelText(/discomfort/i), '3');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(useStore.getState().doses[0]).toEqual({ ...dose, painLevel: 3 });
    await user.click(screen.getByRole('button', { name: 'Undo last edit' }));
    expect(useStore.getState().doses).toEqual([dose, other]);
  });
});
