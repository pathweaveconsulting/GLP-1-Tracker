import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { seedStore } from './fixtures';
import { open } from './helpers';
import { useStore } from '../store/useStore';
import { convertTyped } from '../components/modals/EditProfileModal';

describe('weight entry in kg is stored as pounds', () => {
  it('LogWeightModal converts at the edge and respects per-unit bounds', async () => {
    seedStore('empty', 'kg');
    const user = userEvent.setup();
    await open('/weight');
    await user.click(screen.getByRole('button', { name: /record weight/i }));
    const dialog = screen.getByRole('dialog', { name: /log weight/i });
    const input = within(dialog).getByLabelText(/weight \(kg\)/i);

    await user.clear(input);
    await user.type(input, '400'); // fine in lbs, impossible in kg
    await user.click(within(dialog).getByRole('button', { name: /save weight/i }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/between 23 and 362 kg/);
    expect(useStore.getState().weights).toHaveLength(0);

    await user.clear(input);
    await user.type(input, '90');
    await user.click(within(dialog).getByRole('button', { name: /save weight/i }));
    const stored = useStore.getState().weights;
    expect(stored).toHaveLength(1);
    expect(stored[0].weightLbs).toBeCloseTo(90 * 2.2046226, 3);
    expect(document.querySelector('main')!.textContent).toMatch(/90\.0\s*kg/);
  });

  it('shows stored pounds in kg on the log table', async () => {
    seedStore('empty', 'kg');
    useStore.setState({ weights: [{ id: 'a', date: new Date().toISOString(), weightLbs: 220.462 }] });
    const user = userEvent.setup();
    await open('/weight');
    await user.click(screen.getByRole('button', { name: /weight log & table/i }));
    expect(screen.getAllByText('100.0 kg').length).toBeGreaterThan(0);
  });
});

describe('profile unit switch', () => {
  it('converts typed values when the unit toggles, in both directions', () => {
    expect(convertTyped('220.5', 'lbs', 'kg')).toBe('100');
    expect(convertTyped('100', 'kg', 'lbs')).toBe('220.5');
    expect(convertTyped('', 'lbs', 'kg')).toBe('');
    expect(convertTyped('abc', 'lbs', 'kg')).toBe('abc');
  });

  it('EditProfileModal shows stored pounds in kg and saves edits back as pounds', async () => {
    seedStore('empty', 'lbs');
    const user = userEvent.setup();
    await open('/settings');
    await user.click(screen.getByRole('button', { name: /edit profile/i }));
    const dialog = screen.getByRole('dialog', { name: /edit profile/i });
    expect(within(dialog).getByLabelText(/starting weight \(lbs\)/i)).toHaveValue(220);
    await user.click(within(dialog).getByRole('button', { name: 'kg' }));
    expect(within(dialog).getByLabelText(/starting weight \(kg\)/i)).toHaveValue(99.8);
    await user.clear(within(dialog).getByLabelText(/goal weight \(kg\)/i));
    await user.type(within(dialog).getByLabelText(/goal weight \(kg\)/i), '70');
    await user.click(within(dialog).getByRole('button', { name: /save profile/i }));
    const s = useStore.getState().settings;
    expect(s.weightUnit).toBe('kg');
    expect(s.targetWeight).toBeCloseTo(70 * 2.2046226, 3);
    expect(s.startingWeight).toBeCloseTo(99.8 * 2.2046226, 3);
  });
});

describe('no stray unit constants', () => {
  it('keeps the conversion factor in one place', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
    const offenders = walk('src')
      .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.|units\.ts$/.test(f))
      .filter((f) => /0\.4535|2\.2046/.test(fs.readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
