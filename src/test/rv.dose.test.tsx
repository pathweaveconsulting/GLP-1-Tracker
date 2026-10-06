import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { seedStore } from './fixtures';
import { open } from './helpers';
import { useStore } from '../store/useStore';

afterEach(cleanup);

async function openDoseModal() {
  const user = userEvent.setup();
  await open('/doses');
  await user.click(screen.getByRole('button', { name: /record injection/i }));
  return { user, dialog: screen.getByRole('dialog', { name: /log shot/i }) };
}

describe('RV03: the dose form never invents a strength', () => {
  it('first-ever dose: the amount is empty and Save is blocked with an inline message', async () => {
    seedStore('empty', 'lbs');
    const { user, dialog } = await openDoseModal();
    const amount = within(dialog).getByLabelText(/dose amount/i);
    expect(amount).toHaveValue(null);
    await user.click(within(dialog).getByRole('button', { name: /save dose/i }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/dose/i);
    expect(amount).toHaveAttribute('aria-invalid', 'true');
    expect(useStore.getState().doses).toHaveLength(0);
    // typing an amount makes it saveable
    await user.type(amount, '5');
    await user.click(within(dialog).getByRole('button', { name: /save dose/i }));
    expect(useStore.getState().doses.map((d) => d.amountMg)).toEqual([5]);
  });

  it('with history it prefills the last dose of that drug; a drug with no history is blank', async () => {
    seedStore('populated', 'lbs'); // last logged: tirzepatide 7.5
    const { user, dialog } = await openDoseModal();
    expect(within(dialog).getByLabelText(/dose amount/i)).toHaveValue(7.5);
    await user.selectOptions(within(dialog).getByLabelText(/^medication/i), 'Semaglutide');
    expect(within(dialog).getByLabelText(/dose amount/i)).toHaveValue(null);
    await user.selectOptions(within(dialog).getByLabelText(/^medication/i), 'Tirzepatide');
    expect(within(dialog).getByLabelText(/dose amount/i)).toHaveValue(7.5);
  });
});
