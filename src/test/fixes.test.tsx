import { describe, it, expect, afterEach } from 'vitest';
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
  const realLocation = Object.getOwnPropertyDescriptor(window, 'location')!;
  afterEach(() => {
    Object.defineProperty(window, 'location', realLocation); // the tests below stub location.reload
    vi.restoreAllMocks();
  });
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

// ---------------------------------------------------------------- F4
import { within } from '@testing-library/react';
import { seedStore } from './fixtures';
import { open } from './helpers';

describe('F4: storage failures never throw out of handlers', () => {
  const quota = () => new DOMException('The quota has been exceeded.', 'QuotaExceededError');
  let blobs: Blob[] = [];
  const readBlob = (b: Blob) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsText(b); });

  function breakStorage(predicate: (v: string) => boolean = () => true) {
    blobs = [];
    URL.createObjectURL = vi.fn((b: Blob | MediaSource) => { blobs.push(b as Blob); return 'blob:x'; });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const real = Storage.prototype.setItem;
    return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (predicate(v)) throw quota();
      return real.call(this, k, v);
    });
  }

  it('addWeight, addDose and addEffect do not throw and keep working in memory; the flag is raised', () => {
    seedStore('empty', 'lbs');
    useStore.setState({ storageError: false });
    const spy = breakStorage();
    expect(() => useStore.getState().addWeight({ date: new Date().toISOString(), weightLbs: 200 })).not.toThrow();
    expect(() => useStore.getState().addDose({ medication: 'Tirzepatide', amountMg: 5, date: new Date().toISOString(), site: 'x', painLevel: 0, notes: '' })).not.toThrow();
    expect(useStore.getState().weights).toHaveLength(1);
    expect(useStore.getState().doses).toHaveLength(1);
    expect(useStore.getState().storageError).toBe(true);
    spy.mockRestore();
  });

  it('a large restore does not throw, and the banner offers a working backup button', async () => {
    seedStore('empty', 'lbs');
    useStore.setState({ storageError: false });
    const spy = breakStorage((v) => v.length > 2000);
    const big = Array.from({ length: 300 }, (_, i) => ({ id: `w${i}`, weightLbs: 200, date: '2026-02-02T12:00:00.000Z' }));
    expect(() => useStore.getState().replaceAllData({ settings: useStore.getState().settings, doses: [], effects: [], weights: big })).not.toThrow();
    expect(useStore.getState().weights).toHaveLength(300);

    const user = userEvent.setup();
    await open('/settings');
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/can.t be saved on this device/i);
    await user.click(within(alert).getByRole('button', { name: /download a backup/i }));
    const json = JSON.parse(await readBlob(blobs[0]));
    expect(json.format).toBe('glp1-tracker-backup');
    expect(json.data.weights).toHaveLength(300);
    spy.mockRestore();
  });

  it('the log-weight modal still closes normally when saving fails', async () => {
    seedStore('empty', 'lbs');
    useStore.setState({ storageError: false });
    const spy = breakStorage();
    const user = userEvent.setup();
    await open('/weight');
    await user.click(screen.getByRole('button', { name: /record weight/i }));
    const dialog = screen.getByRole('dialog', { name: /log weight/i });
    const input = within(dialog).getByLabelText(/weight \(lbs\)/i);
    await user.clear(input);
    await user.type(input, '200');
    await user.click(within(dialog).getByRole('button', { name: /save weight/i }));
    expect(screen.queryByRole('dialog', { name: /log weight/i })).not.toBeInTheDocument();
    expect(useStore.getState().weights).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent(/can.t be saved/i);
    spy.mockRestore();
  });

  it('blocked storage on read or remove does not throw', async () => {
    const g = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('SecurityError'); });
    await expect(useStore.persist.rehydrate()).resolves.not.toThrow();
    g.mockRestore();
    const r = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('SecurityError'); });
    expect(() => useStore.getState().resetAllData()).not.toThrow();
    r.mockRestore();
  });

  it('the flag clears when a later write succeeds, and dismissing hides the banner', async () => {
    seedStore('empty', 'lbs');
    useStore.setState({ storageError: false });
    const spy = breakStorage();
    useStore.getState().addWeight({ date: new Date().toISOString(), weightLbs: 200 });
    expect(useStore.getState().storageError).toBe(true);
    spy.mockRestore();
    useStore.getState().addWeight({ date: new Date().toISOString(), weightLbs: 201 });
    expect(useStore.getState().storageError).toBe(false);

    const spy2 = breakStorage();
    useStore.getState().addWeight({ date: new Date().toISOString(), weightLbs: 202 });
    const user = userEvent.setup();
    await open('/settings');
    await user.click(screen.getByRole('button', { name: /dismiss storage warning/i }));
    expect(screen.queryByText(/can.t be saved on this device/i)).not.toBeInTheDocument();
    useStore.getState().addWeight({ date: new Date().toISOString(), weightLbs: 203 });
    expect(useStore.getState().storageError).toBe(false); // dismissed for this session
    spy2.mockRestore();
  });
});

// ---------------------------------------------------------------- F7
import { seedStore as seed7 } from './fixtures';
import { open as open7 } from './helpers';

describe('F7: no weekly guidance for oral/unknown medications', () => {
  it('the dose form explains that guidance and the level curve are unavailable for "Other"', async () => {
    seed7('empty', 'lbs');
    const user = userEvent.setup();
    await open7('/doses');
    await user.click(screen.getByRole('button', { name: /record injection/i }));
    const dialog = screen.getByRole('dialog', { name: /log shot/i });
    expect(within(dialog).queryByText(/aren’t available for this medication/i)).not.toBeInTheDocument();
    await user.selectOptions(within(dialog).getByLabelText(/^medication/i), 'Other');
    expect(within(dialog).getByText(/aren’t available for this medication/i)).toHaveTextContent(/Rybelsus/);
    expect(within(dialog).queryByRole('button', { name: /mg$/ })).not.toBeInTheDocument(); // no dose-step chips
  });

  it('legacy Rybelsus data shows no weekly schedule, no level estimate and the note', async () => {
    await rehydrateFrom(oldBlob({
      doses: [{ id: UUID, medication: 'Rybelsus', amountMg: 14, date: new Date(Date.now() - 2 * 86400000).toISOString(), site: '', painLevel: 0, notes: '' }],
      weights: [{ id: UUID + 'w', weightLbs: 200, date: new Date().toISOString() }],
      effects: [],
      settings: demoSettings,
    }));
    useStore.setState({ hasOnboarded: true });
    expect(useStore.getState().doses[0].medication).toBe('Other');
    window.history.pushState({}, '', '/');
    render(<App />);
    await screen.findAllByRole('heading', { level: 1 });
    const text = document.querySelector('main')!.textContent!;
    expect(text).not.toMatch(/above the usual maximum|if you dose weekly/);
    expect(text).toMatch(/No set schedule for this medication/);
    expect(text).toMatch(/aren’t available for this medication/);
    expect(text).toMatch(/No estimate is available/);
  });

  it('Onboarding shows the note when "Other" is chosen', async () => {
    useStore.getState().resetAllData();
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByLabelText(/^medication/i), 'Other');
    expect(screen.getByText(/aren’t available for this medication/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------- F8
import { SafetyNotice } from '../components/SafetyNotice';
import { MemoryRouter } from 'react-router-dom';

describe('F8: the safety list does not read as exhaustive', () => {
  const LINE = /These are examples, not a complete list\. Follow your medication leaflet and call a healthcare professional or emergency services if you are worried\./;
  for (const variant of ['full', 'compact'] as const) {
    it(`${variant} variant says so`, () => {
      render(<MemoryRouter><SafetyNotice variant={variant} /></MemoryRouter>);
      expect(document.body.textContent).toMatch(LINE);
    });
  }
});

// ---------------------------------------------------------------- F9
import { isoDaysAgo as daysAgo9 } from './fixtures';

describe('F9: one weigh-in and one dose never produce a projection', () => {
  const pages = ['/', '/health', '/results?tab=journey', '/results?tab=progress', '/weight', '/reports', '/recommendations', '/this-week'];
  for (const path of pages) {
    it(`${path}: no pace projection, no "Reached", no projected date`, async () => {
      seed7('empty', 'lbs');
      useStore.setState({
        weights: [{ id: 'w', date: daysAgo9(1), weightLbs: 200 }],
        doses: [{ id: 'd', date: daysAgo9(3), medication: 'Tirzepatide', amountMg: 5, site: 'Thigh: Left', painLevel: 0, notes: '' }],
        settings: { ...useStore.getState().settings, startingWeight: 200, targetWeight: 180, heightInches: 68 },
      });
      await open7(path);
      const text = document.querySelector('main')!.textContent!;
      expect(text).not.toContain('If your recent pace continues');
      expect(text).not.toContain('Reached');
      expect(text).not.toMatch(/\bAround [A-Z][a-z]{2} \d{4}/); // Health's projected month
      expect(text).not.toMatch(/Goal Date(?!–)[A-Z][a-z]{2} \d{1,2}, \d{4}/); // Journey's projected date
      cleanup();
    });
  }
  it('/results?tab=journey says what is missing instead', async () => {
    seed7('empty', 'lbs');
    useStore.setState({ weights: [{ id: 'w', date: daysAgo9(1), weightLbs: 200 }], settings: { ...useStore.getState().settings, targetWeight: 180 } });
    await open7('/results?tab=journey');
    expect(document.querySelector('main')!.textContent).toMatch(/Goal Date–Needs 3\+ weigh-ins over 2\+ weeks/);
  });
});

// ---------------------------------------------------------------- F10
import { useState } from 'react';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

describe('F10: dialog focus and stacked Escape', () => {
  it.each([
    ['/weight', /record weight/i, /log weight/i, /weight \(lbs\)/i],
    ['/doses', /record injection/i, /log shot/i, /^medication/i],
    ['/effects', /record symptoms/i, /log how you feel/i, /^date/i],
    ['/settings', /edit profile/i, /edit profile/i, /primary medication/i],
  ])('%s: opening the form dialog focuses its first field, not the Close button', async (path, opener, name, firstField) => {
    seed7('empty', 'lbs');
    const user = userEvent.setup();
    await open7(path);
    const trigger = screen.getAllByRole('button', { name: opener })[0];
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name });
    expect(within(dialog).getByLabelText(firstField)).toHaveFocus();
    expect(within(dialog).getByRole('button', { name: /close dialog/i })).not.toHaveFocus();
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus(); // focus returns to the trigger
  });

  it('confirm dialogs still focus Cancel', async () => {
    seed7('empty', 'lbs');
    const user = userEvent.setup();
    await open7('/settings');
    await user.click(screen.getByRole('button', { name: /erase local data/i }));
    expect(within(screen.getByRole('alertdialog')).getByRole('button', { name: /cancel/i })).toHaveFocus();
  });

  function Stack() {
    const [a, setA] = useState(true);
    const [b, setB] = useState(false);
    const [c, setC] = useState(false);
    return (
      <>
        <button type="button">outside</button>
        <Modal open={a} onClose={() => setA(false)} title="Dialog A"><button type="button" onClick={() => setB(true)}>Open B</button></Modal>
        <Modal open={b} onClose={() => setB(false)} title="Dialog B"><button type="button" onClick={() => setC(true)}>Open C</button></Modal>
        <ConfirmDialog open={c} title="Dialog C" description="sure?" confirmLabel="Yes" onConfirm={() => setC(false)} onCancel={() => setC(false)} />
      </>
    );
  }

  it('Escape closes only the topmost dialog, one at a time, and focus returns to each trigger', async () => {
    const user = userEvent.setup();
    render(<Stack />);
    await user.click(screen.getByRole('button', { name: 'Open B' }));
    const openC = screen.getByRole('button', { name: 'Open C' });
    await user.click(openC);
    expect(screen.getAllByRole('dialog').length + screen.getAllByRole('alertdialog').length).toBe(3);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Dialog B' })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Dialog A' })).toBeInTheDocument();
    expect(openC).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Dialog B' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Dialog A' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open B' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Tab stays inside the top dialog only', async () => {
    const user = userEvent.setup();
    render(<Stack />);
    await user.click(screen.getByRole('button', { name: 'Open B' }));
    const top = screen.getByRole('dialog', { name: 'Dialog B' });
    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(top.contains(document.activeElement)).toBe(true);
    }
  });
});
