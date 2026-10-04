import { describe, it, expect } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { useStore, STORAGE_KEY } from '../store/useStore';

const UUID = '3f2b8c1e-aaaa-4bbb-8ccc-1234567890ab';
const demoSettings = { medication: 'Mounjaro', startingWeight: 220, targetWeight: 170, heightInches: 68, startDate: '2026-08-01T00:00:00.000Z' };

/** Seed the persisted blob exactly as the old build wrote it, then rehydrate. (setState first: it writes to storage.) */
export async function rehydrateFrom(raw: string | object) {
  useStore.setState({ doses: [], weights: [], effects: [], hasOnboarded: false });
  localStorage.setItem(STORAGE_KEY, typeof raw === 'string' ? raw : JSON.stringify(raw));
  await useStore.persist.rehydrate();
}
export const oldBlob = (state: object) => ({ state, version: 0 });

describe('F1: welcome-back onboarding after an upgrade', () => {
  const real = {
    doses: [{ id: UUID, medication: 'Zepbound', amountMg: 5, date: '2026-09-10T12:00:00.000Z', site: 'Left Thigh', painLevel: 1, notes: '' }],
    weights: [
      { id: UUID + 'a', weightLbs: 205.5, date: '2026-09-12T12:00:00.000Z' },
      { id: UUID + 'b', weightLbs: 203, date: '2026-09-20T12:00:00.000Z' },
    ],
    effects: [],
  };

  it('keeps real rows, drops the demo profile, and pre-fills from the earliest entries', async () => {
    await rehydrateFrom(oldBlob({ ...real, doses: [...real.doses, { ...real.doses[0], id: 'dose-3' }], weights: [...real.weights, { id: 'weight-12', weightLbs: 220, date: '2026-08-01T00:00:00Z' }], settings: demoSettings }));
    const s = useStore.getState();
    expect(s.hasOnboarded).toBe(false);
    expect(s.weights).toHaveLength(2);
    expect(JSON.stringify(s.settings)).not.toMatch(/\b(220|170|68)\b/);

    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/welcome back/i);
    expect(document.body.textContent).toMatch(/We kept your 3 entries/);
    expect(document.body.textContent).not.toMatch(/\b(220|170)\b/);
    expect(screen.getByLabelText(/^medication/i)).toHaveValue('Tirzepatide');
    expect(screen.getByLabelText(/starting weight/i)).toHaveValue(205.5); // earliest real weigh-in
    expect(screen.getByLabelText(/treatment start date/i)).toHaveValue('2026-09-10'); // earliest dose (before the first weigh-in)
    expect(screen.getByLabelText(/goal weight/i)).toHaveValue(null);
    expect(screen.getByLabelText(/height \(feet\)/i)).toHaveValue(null);
  });

  it('requires goal and height, and does not seed a duplicate starting-weight entry', async () => {
    await rehydrateFrom(oldBlob({ ...real, settings: demoSettings }));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /start my journey/i }));
    expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(2); // goal + height
    expect(useStore.getState().hasOnboarded).toBe(false);

    await user.type(screen.getByLabelText(/goal weight/i), '180');
    await user.type(screen.getByLabelText(/height \(feet\)/i), '5');
    await user.type(screen.getByLabelText(/height \(inches\)/i), '9');
    await user.click(screen.getByRole('button', { name: /start my journey/i }));
    const s = useStore.getState();
    expect(s.hasOnboarded).toBe(true);
    expect(s.weights).toHaveLength(2); // no extra seeded entry
    expect(s.settings.targetWeight).toBe(180);
    expect(s.settings.heightInches).toBe(69);
    expect(s.settings.startingWeight).toBe(205.5);
  });

  it('demo-only data still gives the blank first-run onboarding', async () => {
    await rehydrateFrom(oldBlob({ doses: [{ ...real.doses[0], id: 'dose-1' }], weights: [{ ...real.weights[0], id: 'weight-1' }], effects: [], settings: demoSettings }));
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/set up your journey/i);
    expect(screen.getByLabelText(/starting weight/i)).toHaveValue(null);
  });

  it('data that is already version 1 is untouched', async () => {
    const v1 = { state: { ...real, settings: { medication: 'Tirzepatide', startingWeight: 210, targetWeight: 175, heightInches: 70, startDate: '2026-09-01T12:00:00.000Z', weightUnit: 'lbs' }, hasOnboarded: true }, version: 1 };
    await rehydrateFrom(v1);
    expect(useStore.getState().settings.startingWeight).toBe(210);
    expect(useStore.getState().hasOnboarded).toBe(true);
    cleanup();
  });
});

// ---------------------------------------------------------------- F2 + F12
import { vi } from 'vitest';
import { CORRUPT_KEY } from '../store/keys';
import { ErrorBoundary } from '../components/ErrorBoundary';

describe('F2/F12: unreadable stored rows never crash the app', () => {
  const goodW = { id: UUID + 'w', weightLbs: 201, date: '2026-09-12T12:00:00.000Z' };
  const goodD = { id: UUID + 'd', medication: 'Tirzepatide', amountMg: 5, date: '2026-09-10T12:00:00.000Z', site: 'x', painLevel: 0, notes: '' };
  const v1 = (state: object) => ({ state: { effects: [], settings: { medication: 'Tirzepatide', startingWeight: 210, targetWeight: 180, heightInches: 70, startDate: '2026-09-01T12:00:00.000Z', weightUnit: 'lbs' }, hasOnboarded: true, ...state }, version: 1 });

  const cases: Array<[string, object | string, number]> = [
    ['a dose row with no date', v1({ doses: [goodD, { id: UUID + 'x', medication: 'Tirzepatide', amountMg: 5 }], weights: [goodW] }), 1],
    ['a weight with date "zzz"', v1({ doses: [goodD], weights: [goodW, { id: UUID + 'z', weightLbs: 200, date: 'zzz' }] }), 1],
    ['a dose with amountMg "abc"', v1({ doses: [goodD, { ...goodD, id: UUID + 'a', amountMg: 'abc' }], weights: [goodW] }), 1],
    ['rows that are not objects', v1({ doses: [goodD, null, 5, 'x'], weights: [goodW] }), 3],
    ['the same garbage in an old (version 0) blob', { state: { doses: [goodD, { id: UUID + 'x' }], weights: [goodW], effects: [], settings: demoSettings }, version: 0 }, 1],
  ];
  for (const [name, blob, expectedDropped] of cases) {
    it(`${name}: no crash, valid rows survive, notice shown, original kept`, async () => {
      const raw = typeof blob === 'string' ? blob : JSON.stringify(blob);
      await rehydrateFrom(raw);
      const s = useStore.getState();
      expect(s.skippedEntries).toBe(expectedDropped);
      expect(s.weights.map((w) => w.id)).toEqual([goodW.id]);
      expect(s.doses.map((d) => d.id)).toContain(goodD.id);
      expect(localStorage.getItem(CORRUPT_KEY)).toBe(raw);

      window.history.pushState({}, '', '/');
      render(<App />);
      expect(await screen.findAllByRole('heading', { level: 1 })).not.toHaveLength(0);
      expect(screen.getAllByRole('status').map((n) => n.textContent).join(' ')).toContain(`${expectedDropped} ${expectedDropped === 1 ? 'entry' : 'entries'} couldn’t be read`);
      cleanup();
    });
  }

  it('the notice is dismissible', async () => {
    await rehydrateFrom(JSON.stringify(v1({ doses: [goodD, { id: UUID }], weights: [goodW] })));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /dismiss notice/i }));
    expect(screen.queryByText(/couldn’t be read/)).not.toBeInTheDocument();
    expect(useStore.getState().skippedEntries).toBe(0);
  });

  for (const [name, raw] of [['{"state":null}', '{"state":null,"version":1}'], ['truncated JSON', '{"state":{"doses":[{"id":"abc'], ['not JSON', 'hello']] as const) {
    it(`${name}: blank app, no crash, original blob copied before anything overwrites it`, async () => {
      await rehydrateFrom(raw);
      expect(useStore.getState().weights).toEqual([]);
      expect(localStorage.getItem(CORRUPT_KEY)).toBe(raw);
      render(<App />);
      expect((await screen.findAllByRole('heading', { level: 1 }))[0]).toHaveTextContent(/set up your journey/i);
      // a later write replaces the main key but never the rescue copy
      useStore.getState().addWeight({ date: new Date().toISOString(), weightLbs: 200 });
      expect(localStorage.getItem(CORRUPT_KEY)).toBe(raw);
      cleanup();
    });
  }

  it('keeps only the newest rescue copy', async () => {
    await rehydrateFrom('first-garbage');
    await rehydrateFrom('second-garbage');
    expect(localStorage.getItem(CORRUPT_KEY)).toBe('second-garbage');
  });

  it('valid data is not copied and shows no notice', async () => {
    await rehydrateFrom(JSON.stringify(v1({ doses: [goodD], weights: [goodW] })));
    expect(localStorage.getItem(CORRUPT_KEY)).toBeNull();
    expect(useStore.getState().skippedEntries).toBe(0);
  });

  it('Erase in Settings also removes the rescue copy', async () => {
    await rehydrateFrom('garbage');
    expect(localStorage.getItem(CORRUPT_KEY)).toBe('garbage');
    useStore.getState().resetAllData();
    expect(localStorage.getItem(CORRUPT_KEY)).toBeNull();
  });
});

describe('F2: ErrorBoundary', () => {
  function Boom(): never { throw new Error('kaboom'); }

  it('renders without the store and its Download raw data button downloads the stored string', async () => {
    const raw = JSON.stringify({ state: { weights: [] }, version: 1 });
    localStorage.setItem(STORAGE_KEY, raw);
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((b: Blob | MediaSource) => { blobs.push(b as Blob); return 'blob:x'; });
    URL.revokeObjectURL = vi.fn();
    const clicks: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { clicks.push(this.download); });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
    await user.click(screen.getByRole('button', { name: /download raw data/i }));
    expect(clicks[0]).toMatch(/^glp1-tracker-raw-data-.*\.json$/);
    const text = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsText(blobs[0]); });
    expect(text).toBe(raw);
    err.mockRestore();
  });

  it('Reset app asks first, keeps a rescue copy, clears the main key and reloads', async () => {
    localStorage.setItem(STORAGE_KEY, 'precious');
    const reload = vi.fn();
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, reload } });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    await user.click(screen.getByRole('button', { name: /reset app/i }));
    expect(localStorage.getItem(STORAGE_KEY)).toBe('precious'); // not yet
    await user.click(screen.getByRole('button', { name: /erase and reload/i }));
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(CORRUPT_KEY)).toBe('precious');
    expect(reload).toHaveBeenCalled();
    err.mockRestore();
  });

  it('Reload calls location.reload and a healthy tree renders normally', async () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, reload } });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    const { unmount } = render(<ErrorBoundary><Boom /></ErrorBoundary>);
    await user.click(screen.getByRole('button', { name: /^reload$/i }));
    expect(reload).toHaveBeenCalled();
    unmount();
    render(<ErrorBoundary><p>fine</p></ErrorBoundary>);
    expect(screen.getByText('fine')).toBeInTheDocument();
    err.mockRestore();
  });
});
