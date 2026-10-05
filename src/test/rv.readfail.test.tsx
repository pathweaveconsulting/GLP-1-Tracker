import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { useStore, STORAGE_KEY } from '../store/useStore';
import { seedStore } from './fixtures';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

const PRECIOUS = JSON.stringify({ state: { doses: [], weights: [{ id: 'keep-me', weightLbs: 201, date: '2026-01-01T12:00:00.000Z' }], effects: [], hasOnboarded: true, settings: { medication: 'Tirzepatide', startingWeight: 210, targetWeight: 180, heightInches: 70, startDate: '2026-01-01T12:00:00.000Z', weightUnit: 'lbs' } }, version: 1 });

/** Make the initial read of the main key throw (storage unreadable), then load the store the way startup does. */
async function loadWithUnreadableStorage() {
  useStore.setState({ doses: [], weights: [], effects: [], hasOnboarded: false }); // first: setState writes to storage
  localStorage.setItem(STORAGE_KEY, PRECIOUS);
  const realGet = Storage.prototype.getItem;
  const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, k: string) {
    if (k === STORAGE_KEY) throw new DOMException('denied', 'SecurityError');
    return realGet.call(this, k);
  });
  await useStore.persist.rehydrate();
  return spy;
}

describe('RV01: an unreadable initial read never leads to overwriting the stored data', () => {
  it('raises a flag, refuses to write, and leaves the stored bytes untouched', async () => {
    const spy = await loadWithUnreadableStorage();
    expect(useStore.getState().readFailed).toBe(true);
    useStore.getState().addWeight({ date: new Date().toISOString(), weightLbs: 190 });
    useStore.getState().addDose({ medication: 'Tirzepatide', amountMg: 5, date: new Date().toISOString(), site: 'x', painLevel: 0, notes: '' });
    spy.mockRestore(); // storage becomes readable again, but the app must still not have written
    expect(localStorage.getItem(STORAGE_KEY)).toBe(PRECIOUS);
    expect(useStore.getState().weights).toHaveLength(1); // still working in memory
  });

  it('shows a banner with the reason and the two explicit actions', async () => {
    await loadWithUnreadableStorage();
    window.history.pushState({}, '', '/');
    render(<App />);
    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent(/saved data couldn.t be read/i);
    expect(banner).toHaveTextContent(/saving is paused/i);
    expect(within(banner).getByRole('button', { name: /download a backup/i })).toBeInTheDocument();
    expect(within(banner).getByRole('button', { name: /start fresh/i })).toBeInTheDocument();
  });

  it('"Start fresh" clears the flag and writing resumes', async () => {
    const spy = await loadWithUnreadableStorage();
    spy.mockRestore();
    window.history.pushState({}, '', '/');
    render(<App />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /start fresh/i }));
    expect(useStore.getState().readFailed).toBe(false);
    useStore.getState().addWeight({ date: new Date().toISOString(), weightLbs: 190 });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.state.weights.map((w: { weightLbs: number }) => w.weightLbs)).toContain(190);
    await waitFor(() => expect(screen.queryByText(/saving is paused/i)).not.toBeInTheDocument());
  });

  it('downloading a backup is the other explicit action: it resumes saving too', async () => {
    const spy = await loadWithUnreadableStorage();
    spy.mockRestore();
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    window.history.pushState({}, '', '/');
    render(<App />);
    await userEvent.setup().click(await screen.findByRole('button', { name: /download a backup/i }));
    expect(useStore.getState().readFailed).toBe(false);
  });

  it('a normal read never sets the flag, and writes work as before', async () => {
    seedStore('empty', 'lbs');
    localStorage.setItem(STORAGE_KEY, PRECIOUS);
    await useStore.persist.rehydrate();
    expect(useStore.getState().readFailed).toBe(false);
    useStore.getState().addWeight({ date: new Date().toISOString(), weightLbs: 190 });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).state.weights).toHaveLength(2);
  });

  it('Erase (resetAllData) is explicit too: it clears the flag', async () => {
    await loadWithUnreadableStorage();
    useStore.getState().resetAllData();
    expect(useStore.getState().readFailed).toBe(false);
  });
});
