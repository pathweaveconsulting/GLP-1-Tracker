import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useStore, STORAGE_KEY } from '../store/useStore';
import { CORRUPT_KEY } from '../store/keys';

const realLocation = Object.getOwnPropertyDescriptor(window, 'location')!;
afterEach(() => {
  cleanup();
  Object.defineProperty(window, 'location', realLocation);
  vi.restoreAllMocks();
  localStorage.clear();
});

function Boom(): never { throw new Error('kaboom'); }
const readBlob = (b: Blob) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsText(b); });

function captureDownloads() {
  const blobs: Blob[] = [];
  const names: string[] = [];
  URL.createObjectURL = vi.fn((b: Blob | MediaSource) => { blobs.push(b as Blob); return 'blob:x'; });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { names.push(this.download); });
  return { blobs, names };
}

describe('RV02: ErrorBoundary says only what it knows', () => {
  it('does not claim the data is still stored or that a rescue copy is kept', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    const text = screen.getByRole('alert').textContent!;
    expect(text).toContain('Some data may be unsaved or unreadable. Reload, download a raw copy, or reset.');
    expect(text).not.toMatch(/still stored|rescue copy is kept|is kept until/i);
  });

  it('the reset confirmation says the app will TRY to keep a rescue copy and that this can fail', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    await user.click(screen.getByRole('button', { name: /reset app/i }));
    const text = screen.getByRole('alert').textContent!;
    expect(text).toMatch(/will try to keep a rescue copy/i);
    expect(text).toMatch(/can fail when (browser )?storage is (full or blocked|blocked or full)/i);
    expect(text).not.toMatch(/rescue copy is kept/i);
  });

  it('offers the live data and the rescue copy as two separately labelled downloads', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem(STORAGE_KEY, 'LIVE-BYTES');
    localStorage.setItem(CORRUPT_KEY, 'RESCUE-BYTES');
    const { blobs, names } = captureDownloads();
    const user = userEvent.setup();
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    await user.click(screen.getByRole('button', { name: /download raw data \(current\)/i }));
    await user.click(screen.getByRole('button', { name: /download rescue copy/i }));
    expect(await readBlob(blobs[0])).toBe('LIVE-BYTES');
    expect(await readBlob(blobs[1])).toBe('RESCUE-BYTES');
    expect(names[0]).not.toBe(names[1]);
    expect(names[0]).toMatch(/current/);
    expect(names[1]).toMatch(/rescue/);
  });

  it('the live download does not silently hand over the rescue copy, and the rescue button is hidden when there is none', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem(CORRUPT_KEY, 'RESCUE-ONLY');
    const { blobs } = captureDownloads();
    const user = userEvent.setup();
    const { unmount } = render(<ErrorBoundary><Boom /></ErrorBoundary>);
    await user.click(screen.getByRole('button', { name: /download raw data \(current\)/i }));
    expect(blobs).toHaveLength(0);
    expect(screen.getByRole('alert')).toHaveTextContent(/no current data to download/i);
    unmount();
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, 'X');
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.queryByRole('button', { name: /download rescue copy/i })).not.toBeInTheDocument();
  });
});

describe('RV02: an unreadable envelope produces a visible, honest notice even with zero dropped rows', () => {
  async function load(raw: string) {
    localStorage.setItem(STORAGE_KEY, raw);
    await useStore.persist.rehydrate();
    window.history.pushState({}, '', '/');
    render(<App />);
  }

  for (const [name, raw] of [['truncated JSON', '{"state":{"weights":[{"id":"a","weightLbs":2'], ['state: null', '{"state":null,"version":1}'], ['not JSON at all', 'hello']] as const) {
    it(`${name}: notice shown, rescue copy claimed only because it was kept, original downloadable`, async () => {
      const { blobs } = captureDownloads();
      await load(raw);
      const notice = await screen.findByRole('status');
      expect(useStore.getState().skippedEntries).toBe(0);
      expect(notice).toHaveTextContent(/couldn.t be read/i);
      expect(notice).toHaveTextContent(/A copy of the original data was kept on this device/);
      expect(localStorage.getItem(CORRUPT_KEY)).toBe(raw);
      await userEvent.setup().click(within(notice).getByRole('button', { name: /download original data/i }));
      expect(await readBlob(blobs[0])).toBe(raw);
    });
  }

  it('if the rescue copy cannot be stored the notice says so and downloads what is still in the main key', async () => {
    const real = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (k === CORRUPT_KEY) throw new DOMException('full', 'QuotaExceededError');
      return real.call(this, k, v);
    });
    const { blobs } = captureDownloads();
    const raw = '{"state":{"weights":[{"id":"a"';
    await load(raw);
    const notice = await screen.findByRole('status');
    expect(notice).toHaveTextContent(/We couldn.t keep a copy of your data\. Download it now\./);
    expect(notice).not.toHaveTextContent(/A copy of the original data was kept/);
    await userEvent.setup().click(within(notice).getByRole('button', { name: /download it now|download original data/i }));
    expect(await readBlob(blobs[0])).toBe(raw);
  });

  it('a healthy blob shows no notice', async () => {
    await load(JSON.stringify({ state: { doses: [], weights: [], effects: [], hasOnboarded: false, settings: { medication: 'Tirzepatide', startingWeight: 0, targetWeight: 0, heightInches: 0, startDate: '2026-01-01T12:00:00.000Z', weightUnit: 'lbs' } }, version: 1 }));
    expect(screen.queryByText(/couldn.t be read/i)).not.toBeInTheDocument();
  });
});
