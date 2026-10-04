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
