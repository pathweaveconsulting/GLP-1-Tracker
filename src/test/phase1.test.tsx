import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { useStore, STORAGE_KEY } from '../store/useStore';
import { seedStore } from './fixtures';
import { open } from './helpers';
import { newId } from '../lib/id';

describe('first run', () => {
  it('shows onboarding, with no demo data, when nothing is stored', () => {
    useStore.getState().resetAllData();
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/set up your journey/i);
    expect(useStore.getState().weights).toEqual([]);
    expect(useStore.getState().doses).toEqual([]);
  });

  it('validates with inline alerts and stores the starting weight as the first entry', async () => {
    useStore.getState().resetAllData();
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    expect(screen.getAllByRole('alert')).toHaveLength(3);
    expect(useStore.getState().hasOnboarded).toBe(false);

    // Choose kg first: since R4 the unit toggle converts a number that is already typed (it no longer reinterprets it).
    await user.click(screen.getByRole('button', { name: 'kg' }));
    await user.type(screen.getByLabelText(/starting weight/i), '90');
    await user.type(screen.getByLabelText(/goal weight/i), '75');
    await user.selectOptions(screen.getByLabelText(/^medication$/i), 'Tirzepatide');
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    expect(useStore.getState().hasOnboarded).toBe(false);
    await user.type(screen.getByLabelText(/height \(cm\)/i), '172.72');
    await user.type(screen.getByLabelText(/treatment start date/i), '2026-01-05');
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    await user.click(screen.getByRole('button', { name: /start my journey/i }));
    expect(screen.getByText(/please confirm/i)).toBeInTheDocument();
    expect(useStore.getState().hasOnboarded).toBe(false);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /start my journey/i }));
    const s = useStore.getState();
    expect(s.hasOnboarded).toBe(true);
    expect(s.weights).toHaveLength(1);
    expect(s.weights[0].weightLbs).toBeCloseTo(90 * 2.2046226, 3);
    expect(s.settings.weightUnit).toBe('kg');
    expect(s.settings.heightInches).toBe(68);
  });
});

describe('erase data', () => {
  it('asks for confirmation, then returns to onboarding with empty arrays and cleared storage', async () => {
    seedStore('populated', 'lbs');
    localStorage.setItem('unrelated-key', 'keep me');
    const user = userEvent.setup();
    await open('/settings');

    await user.click(screen.getByRole('button', { name: /erase local data/i }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByRole('button', { name: /cancel/i })).toHaveFocus();

    // Escape closes without erasing
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(useStore.getState().weights.length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /erase local data/i }));
    await user.click(screen.getByRole('button', { name: /erase everything/i }));

    const s = useStore.getState();
    expect(s.doses).toEqual([]);
    expect(s.weights).toEqual([]);
    expect(s.effects).toEqual([]);
    expect(s.hasOnboarded).toBe(false);
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/set up your journey/i));
    expect(localStorage.getItem('unrelated-key')).toBe('keep me');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe('persistence', () => {
  it('does not persist action functions', () => {
    useStore.setState({ hasOnboarded: true });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.version).toBe(1);
    expect(Object.keys(stored.state).sort()).toEqual(['doses', 'effects', 'hasOnboarded', 'settings', 'weights']);
  });
});

describe('newId', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('falls back when crypto.randomUUID is unavailable (insecure context)', () => {
    vi.stubGlobal('crypto', { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });
    const a = newId();
    const b = newId();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a).not.toBe(b);
  });

  it('still works with no crypto at all', () => {
    vi.stubGlobal('crypto', undefined);
    expect(newId()).toMatch(/^[0-9a-f-]{36}$/);
  });
});
