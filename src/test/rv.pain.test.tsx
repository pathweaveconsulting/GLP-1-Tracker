import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { seedStore } from './fixtures';
import { open } from './helpers';
import { useStore, STORAGE_KEY } from '../store/useStore';

afterEach(() => { cleanup(); localStorage.clear(); });

async function openDoseModal() {
  const user = userEvent.setup();
  await open('/doses');
  await user.click(screen.getByRole('button', { name: /record injection/i }));
  const dialog = screen.getByRole('dialog', { name: /log shot/i });
  await user.click(within(dialog).getByRole('button', { name: '5 mg' }));
  return { user, dialog };
}

describe('3b: the dose form records pain only when the user chooses to', () => {
  it('defaults to "Not recorded" (an accessible, optional control) and saves null', async () => {
    seedStore('empty', 'lbs');
    const { user, dialog } = await openDoseModal();
    const pain = within(dialog).getByLabelText(/injection-site discomfort \(optional\)/i) as HTMLSelectElement;
    expect(pain.selectedOptions[0].textContent).toBe('Not recorded');
    await user.click(within(dialog).getByRole('button', { name: /save dose/i }));
    expect(useStore.getState().doses.map((d) => d.painLevel)).toEqual([null]);
  });

  it('a chosen 3 saves 3, and a chosen 0 ("0 – none") saves 0, which is different from not recorded', async () => {
    seedStore('empty', 'lbs');
    let ctx = await openDoseModal();
    await ctx.user.selectOptions(within(ctx.dialog).getByLabelText(/discomfort/i), '3');
    await ctx.user.click(within(ctx.dialog).getByRole('button', { name: /save dose/i }));
    cleanup();
    ctx = await openDoseModal();
    await ctx.user.selectOptions(within(ctx.dialog).getByLabelText(/discomfort/i), '0');
    await ctx.user.click(within(ctx.dialog).getByRole('button', { name: /save dose/i }));
    // The same dose a minute later is flagged as a possible duplicate (Pack 3.4); confirming saves it.
    await ctx.user.click(within(ctx.dialog).getByRole('button', { name: 'Save anyway' }));
    expect(useStore.getState().doses.map((d) => d.painLevel)).toEqual([3, 0]);
  });

  it('choosing a value and then going back to "Not recorded" saves null', async () => {
    seedStore('empty', 'lbs');
    const { user, dialog } = await openDoseModal();
    const pain = within(dialog).getByLabelText(/discomfort/i);
    await user.selectOptions(pain, '7');
    await user.selectOptions(pain, 'Not recorded');
    await user.click(within(dialog).getByRole('button', { name: /save dose/i }));
    expect(useStore.getState().doses[0].painLevel).toBeNull();
  });
});

describe('3b: loading older stored data does not invent a pain level', () => {
  const settings = { medication: 'Tirzepatide', startingWeight: 210, targetWeight: 180, heightInches: 70, startDate: '2026-09-01T12:00:00.000Z', weightUnit: 'lbs' };
  const UUID = '3f2b8c1e-aaaa-4bbb-8ccc-1234567890ab';
  const dose = (id: string, extra: object) => ({ id, medication: 'Tirzepatide', amountMg: 5, date: '2026-09-10T12:00:00.000Z', site: 'x', notes: '', ...extra });

  for (const [version, label] of [[1, 'current (v1)'], [0, 'old (v0)']] as const) {
    it(`${label} blob: a dose with no pain stays unrecorded, and recorded 0 and 4 are kept exactly`, async () => {
      useStore.setState({ doses: [], weights: [], effects: [], hasOnboarded: false });
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { doses: [dose(UUID + 'a', {}), dose(UUID + 'b', { painLevel: 0 }), dose(UUID + 'c', { painLevel: 4 })], weights: [], effects: [], settings, hasOnboarded: true }, version }));
      await useStore.persist.rehydrate();
      const byId = Object.fromEntries(useStore.getState().doses.map((d) => [d.id.slice(-1), d.painLevel]));
      expect(byId).toEqual({ a: null, b: 0, c: 4 });
      expect(useStore.getState().skippedEntries).toBe(0);
    });
  }
});
