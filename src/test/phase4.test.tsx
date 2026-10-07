import { describe, it, expect } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { seedStore } from './fixtures';
import { open } from './helpers';
import { useStore } from '../store/useStore';

async function openDoseModal() {
  const user = userEvent.setup();
  await open('/doses');
  await user.click(screen.getByRole('button', { name: /record injection/i }));
  return { user, dialog: screen.getByRole('dialog', { name: /log shot/i }) };
}

describe('LogDoseModal', () => {
  it('has no made-up default: with no history the amount starts empty (RV03)', async () => {
    seedStore('empty', 'lbs');
    const { dialog } = await openDoseModal();
    expect(within(dialog).getByLabelText(/dose amount/i)).toHaveValue(null);
  });

  it('starts at the last dose of that drug, and switching drug re-defaults', async () => {
    seedStore('populated', 'lbs'); // last logged: tirzepatide 7.5
    const { user, dialog } = await openDoseModal();
    expect(within(dialog).getByLabelText(/dose amount/i)).toHaveValue(7.5);
    await user.selectOptions(within(dialog).getByLabelText(/^medication/i), 'Semaglutide');
    expect(within(dialog).getByLabelText(/dose amount/i)).toHaveValue(null); // no semaglutide history: blank, not a reference step
    const names = within(within(dialog).getByLabelText(/^medication/i)).getAllByRole('option').map((o) => o.textContent); // scoped to the medication select (the form now has a second select, for pain)
    expect(names).toEqual(['Tirzepatide', 'Semaglutide', 'Retatrutide', 'Other']);
  });

  it('offers dose-step chips', async () => {
    seedStore('empty', 'lbs');
    const { user, dialog } = await openDoseModal();
    await user.click(within(dialog).getByRole('button', { name: '10 mg' }));
    expect(within(dialog).getByLabelText(/dose amount/i)).toHaveValue(10);
    expect(within(dialog).getByRole('button', { name: '10 mg' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('blocks saving above the standard maximum until the double-check box is ticked', async () => {
    seedStore('empty', 'lbs');
    const { user, dialog } = await openDoseModal();
    const amount = within(dialog).getByLabelText(/dose amount/i);
    await user.clear(amount);
    await user.type(amount, '20');
    expect(within(dialog).getByText(/above the usual maximum of 15 mg/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /save dose/i }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/double-checked/);
    expect(useStore.getState().doses).toHaveLength(0);

    await user.click(within(dialog).getByRole('checkbox', { name: /double-checked/i }));
    await user.click(within(dialog).getByRole('button', { name: /save dose/i }));
    expect(useStore.getState().doses).toHaveLength(1);
    expect(useStore.getState().doses[0].amountMg).toBe(20);
  });

  it('saves a standard dose with the chosen local date and time', async () => {
    seedStore('empty', 'lbs');
    const { user, dialog } = await openDoseModal();
    await user.click(within(dialog).getByRole('button', { name: '2.5 mg' })); // the amount is no longer pre-filled (RV03)
    const date = within(dialog).getByLabelText(/^date/i);
    const time = within(dialog).getByLabelText(/^time/i);
    await user.clear(date);
    await user.type(date, '2026-03-05');
    await user.clear(time);
    await user.type(time, '21:30');
    await user.click(within(dialog).getByRole('button', { name: /save dose/i }));
    const d = useStore.getState().doses[0];
    expect(d.amountMg).toBe(2.5);
    const local = new Date(d.date);
    expect([local.getFullYear(), local.getMonth() + 1, local.getDate(), local.getHours(), local.getMinutes()]).toEqual([2026, 3, 5, 21, 30]);
  });

  it('rejects an injection time in the future', async () => {
    seedStore('empty', 'lbs');
    const { user, dialog } = await openDoseModal();
    await user.click(within(dialog).getByRole('button', { name: '2.5 mg' })); // the amount is no longer pre-filled (RV03)
    const time = within(dialog).getByLabelText(/^time/i);
    const t = new Date(Date.now() + 3 * 3600_000);
    const hh = String(t.getHours()).padStart(2, '0');
    // only meaningful if +3h is still today
    if (t.getDate() === new Date().getDate()) {
      await user.clear(time);
      await user.type(time, `${hh}:${String(t.getMinutes()).padStart(2, '0')}`);
      await user.click(within(dialog).getByRole('button', { name: /save dose/i }));
      expect(within(dialog).getByRole('alert')).toHaveTextContent(/can.t be in the future/);
      expect(useStore.getState().doses).toHaveLength(0);
    }
  });
});

describe('SafetyNotice placement', () => {
  it('appears in full on Health, Recommendations and Settings, and compact in the layout', async () => {
    for (const path of ['/health', '/recommendations', '/settings']) {
      seedStore('empty', 'lbs');
      await open(path);
      const full = screen.getByTestId('safety-full');
      expect(within(full).getByText(/severe or persistent belly pain/i)).toBeInTheDocument();
      expect(within(full).getByText(/yellowing of the skin/i)).toBeInTheDocument();
      expect(within(full).getByText(/thoughts of harming yourself/i)).toBeInTheDocument();
      expect(within(full).getByText(/never take a double dose/i)).toBeInTheDocument();
      expect(within(full).getByText(/not medical advice/i)).toBeInTheDocument();
      expect(screen.getByTestId('safety-compact')).toBeInTheDocument();
      cleanup();
    }
  });

  it('shows the investigational warning only for Retatrutide', async () => {
    seedStore('empty', 'lbs');
    await open('/health');
    expect(screen.queryByText(/not an approved medicine/)).not.toBeInTheDocument();
    cleanup();
    useStore.setState({ settings: { ...useStore.getState().settings, medication: 'Retatrutide' } });
    await open('/health');
    expect(screen.getByText(/not an approved medicine/)).toBeInTheDocument();
  });

  it('is shown during onboarding', async () => {
    const { render } = await import('@testing-library/react');
    const { Onboarding } = await import('../pages/Onboarding');
    useStore.getState().resetAllData();
    render(<Onboarding />);
    expect(screen.getByTestId('safety-compact')).toBeInTheDocument();
  });
});

describe('PK info modal', () => {
  it('is honest about being a simplified illustrative model', async () => {
    seedStore('populated', 'lbs');
    const user = userEvent.setup();
    await open('/');
    await user.click(screen.getByRole('button', { name: /about the estimated level/i }));
    const dialog = screen.getByRole('dialog', { name: /about the estimated level/i });
    expect(dialog).toHaveTextContent(/simplified, illustrative one-compartment model/i);
    expect(dialog).toHaveTextContent(/approximate/i);
    expect(dialog).toHaveTextContent(/not a blood test/i);
    expect(dialog).toHaveTextContent(/never to make dosing decisions/i);
    expect(dialog.textContent).not.toMatch(/peer-reviewed|derived directly/i);
  });
});
