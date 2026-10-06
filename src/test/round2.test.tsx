import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import App from '../App';
import { useStore, STORAGE_KEY } from '../store/useStore';
import { CORRUPT_KEY } from '../store/keys';

const UUID = '3f2b8c1e-aaaa-4bbb-8ccc-1234567890ab';
const goodW = { id: UUID + 'w', weightLbs: 201, date: '2026-09-12T12:00:00.000Z' };
const goodD = { id: UUID + 'd', medication: 'Tirzepatide', amountMg: 5, date: '2026-09-10T12:00:00.000Z', site: 'x', painLevel: 0, notes: '' };
const v1 = (state: object) => ({ state: { effects: [], settings: { medication: 'Tirzepatide', startingWeight: 210, targetWeight: 180, heightInches: 70, startDate: '2026-09-01T12:00:00.000Z', weightUnit: 'lbs' }, hasOnboarded: true, ...state }, version: 1 });
const withBadRow = () => JSON.stringify(v1({ doses: [goodD, { id: UUID + 'x' }], weights: [goodW] }));

/** Seed storage directly (no setState: it would write over the seed) and rehydrate. */
async function reload(raw: string) {
  localStorage.setItem(STORAGE_KEY, raw);
  await useStore.persist.rehydrate();
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('R1: the notice only claims a rescue copy when one was stored', () => {
  it('claims a copy and offers the original when the copy was stored', async () => {
    await reload(withBadRow());
    expect(useStore.getState().rescueKept).toBe(true);
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(await screen.findByText(/A copy of the original data was kept on this device/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download original data/ })).toBeInTheDocument();
  });

  it('says it could not keep a copy, and offers a download, when only the rescue write fails', async () => {
    const real = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (k === CORRUPT_KEY) throw new DOMException('full', 'QuotaExceededError');
      return real.call(this, k, v);
    });
    await reload(withBadRow());
    expect(useStore.getState().rescueKept).toBe(false);
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(await screen.findByText(/We couldn’t keep a copy of your data\. Download it now\./)).toBeInTheDocument();
    expect(screen.queryByText(/A copy of the original data was kept/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download a backup/ })).toBeInTheDocument();
  });

  it('does not claim a copy when main + rescue together exceed the real quota', async () => {
    const fat = 'n'.repeat(2_700_000); // two of these cannot fit in jsdom's 5M-character quota
    const raw = JSON.stringify(v1({ doses: [goodD, { id: UUID + 'x' }], weights: [goodW], effects: [], padding: fat }));
    await reload(raw);
    expect(localStorage.getItem(CORRUPT_KEY) === raw).toBe(useStore.getState().rescueKept);
    expect(useStore.getState().rescueKept).toBe(false);
  });
});

describe('R11: dropped rows are cleaned out of the main blob once the copy is safe', () => {
  it('the second reload shows no notice, and the rescue copy still holds the original', async () => {
    const raw = withBadRow();
    await reload(raw);
    expect(useStore.getState().skippedEntries).toBe(1);
    await useStore.persist.rehydrate();
    expect(useStore.getState().skippedEntries).toBe(0);
    expect(localStorage.getItem(CORRUPT_KEY)).toBe(raw);
    expect(useStore.getState().doses.map((d) => d.id)).toEqual([goodD.id]);
  });

  it('keeps the bad rows in the main blob when the copy could not be stored (no data loss)', async () => {
    const real = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (k === CORRUPT_KEY) throw new DOMException('full', 'QuotaExceededError');
      return real.call(this, k, v);
    });
    const raw = withBadRow();
    await reload(raw);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
  });
});
