import { describe, it, expect } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { seedStore, isoDaysAgo } from './fixtures';
import { open } from './helpers';
import { useStore } from '../store/useStore';
import { createBackup, parseBackup } from '../lib/backup';
import { displayToLbs, lbsToDisplay } from '../lib/units';
import { convertTyped } from '../components/modals/EditProfileModal';
import { isoToLocalDateString, isoToLocalTimeString, localDateTimeToIso } from '../lib/dates';
import { nextDoseInfo, weeklyRate } from '../lib/insights';
import { calculateShotPhase, generatePKCurve } from '../lib/glp1Utils';
import type { DoseEvent } from '../types';

const mainText = () => document.querySelector('main')!.textContent ?? '';
const w = (id: string, daysAgo: number, lbs: number) => ({ id, date: isoDaysAgo(daysAgo), weightLbs: lbs });
const dose = (id: string, iso: string, mg = 5): DoseEvent => ({ id, date: iso, medication: 'Tirzepatide', amountMg: mg, site: 'Thigh: Left', painLevel: 0, notes: '' });

describe('dose edge cases', () => {
  it('two doses on the same day are both kept and every dose page still renders', async () => {
    seedStore('empty', 'lbs');
    const today = new Date();
    const at = (h: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2, h).toISOString();
    useStore.setState({ doses: [dose('a', at(8)), dose('b', at(20), 7.5)] });
    await open('/doses');
    expect(mainText()).toContain('Injections (2)');
    cleanup();
    await open('/');
    expect(mainText()).not.toMatch(/NaN|Infinity|undefined/);
    // "last dose" is the later one
    expect(nextDoseInfo(useStore.getState().doses).lastDose?.id).toBe('b');
    expect(calculateShotPhase(useStore.getState().doses).lastDose?.id).toBe('b');
    expect(generatePKCurve(useStore.getState().doses).medicationName).toBe('Tirzepatide');
  });

  it('a dose dated in the future is rejected by the form', async () => {
    seedStore('empty', 'lbs');
    const user = userEvent.setup();
    await open('/doses');
    await user.click(screen.getByRole('button', { name: /record injection/i }));
    const dialog = screen.getByRole('dialog', { name: /log shot/i });
    const date = within(dialog).getByLabelText(/^date/i);
    await user.clear(date);
    await user.type(date, '2999-01-01');
    await user.click(within(dialog).getByRole('button', { name: /save dose/i }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/future/);
    expect(useStore.getState().doses).toHaveLength(0);
  });

  it('a zero or negative dose amount is rejected', async () => {
    seedStore('empty', 'lbs');
    const user = userEvent.setup();
    await open('/doses');
    await user.click(screen.getByRole('button', { name: /record injection/i }));
    const dialog = screen.getByRole('dialog', { name: /log shot/i });
    for (const v of ['0', '-2']) {
      const amount = within(dialog).getByLabelText(/dose amount/i);
      await user.clear(amount);
      await user.type(amount, v);
      await user.click(within(dialog).getByRole('button', { name: /save dose/i }));
      expect(useStore.getState().doses).toHaveLength(0);
    }
  });
});

describe('weight entry edge cases', () => {
  for (const [label, typed] of [['zero', '0'], ['negative', '-5'], ['5000', '5000']] as const) {
    it(`rejects a weight of ${label}`, async () => {
      seedStore('empty', 'lbs');
      const user = userEvent.setup();
      await open('/weight');
      await user.click(screen.getByRole('button', { name: /record weight/i }));
      const dialog = screen.getByRole('dialog', { name: /log weight/i });
      const input = within(dialog).getByLabelText(/weight \(lbs\)/i);
      await user.clear(input);
      await user.type(input, typed);
      await user.click(within(dialog).getByRole('button', { name: /save weight/i }));
      expect(within(dialog).getByRole('alert')).toHaveTextContent(/between 50 and 800 lbs/);
      expect(useStore.getState().weights).toHaveLength(0);
    });
  }
});

describe('unit round trips', () => {
  const sweep = (from: number, to: number) => { const out: number[] = []; for (let v = from; v <= to; v += 0.1) out.push(Math.round(v * 10) / 10); return out; };

  it('lbs -> kg -> lbs through the profile form stays within 0.05 lb after 20 toggles only if the first toggle does (documents current error)', () => {
    let worst = 0;
    for (const lbs of sweep(100, 400)) {
      let typed = String(lbs);
      for (let i = 0; i < 20; i++) typed = convertTyped(convertTyped(typed, 'lbs', 'kg'), 'kg', 'lbs');
      worst = Math.max(worst, Math.abs(Number(typed) - lbs));
    }
    // The error does not accumulate (it settles after the first round trip) but it is bigger than 0.05 lb.
    expect(worst).toBeLessThan(0.12);
  });

  it.fails('EXPECTED by the review brief: a kg round trip should be within 0.05 lb (it is not: kg is shown to 0.1 kg = 0.22 lb)', () => {
    let worst = 0;
    for (const lbs of sweep(100, 400)) worst = Math.max(worst, Math.abs(displayToLbs(lbsToDisplay(lbs, 'kg'), 'kg') - lbs));
    expect(worst).toBeLessThan(0.05);
  });

  it('lbs display round trip is within 0.05 lb', () => {
    let worst = 0;
    for (let lbs = 70; lbs <= 600; lbs += 0.037) worst = Math.max(worst, Math.abs(displayToLbs(lbsToDisplay(lbs, 'lbs'), 'lbs') - lbs));
    expect(worst).toBeLessThanOrEqual(0.05 + 1e-9);
  });

  it('saving the profile form without changes in kg silently moves the stored goal weight', async () => {
    seedStore('empty', 'kg');
    useStore.setState({ settings: { ...useStore.getState().settings, targetWeight: 170.5 } });
    const user = userEvent.setup();
    await open('/settings');
    await user.click(screen.getByRole('button', { name: /edit profile/i }));
    await user.click(within(screen.getByRole('dialog', { name: /edit profile/i })).getByRole('button', { name: /save profile/i }));
    const moved = Math.abs(useStore.getState().settings.targetWeight - 170.5);
    expect(moved).toBeGreaterThan(0.05); // current behaviour; flagged as a finding
    expect(moved).toBeLessThan(0.12);
  });
});

describe('few weigh-ins', () => {
  const pages = ['/', '/health', '/results?tab=journey', '/results?tab=progress', '/reports', '/recommendations', '/this-week'];
  for (const [label, rows] of [
    ['1 weigh-in', [w('a', 1, 200)]],
    ['2 weigh-ins', [w('a', 20, 205), w('b', 1, 200)]],
    ['3 weigh-ins inside 10 days', [w('a', 10, 205), w('b', 5, 203), w('c', 1, 200)]],
  ] as const) {
    it(`${label}: no pace, no goal date, no NaN on any page`, async () => {
      for (const p of pages) {
        seedStore('empty', 'lbs');
        useStore.setState({ weights: [...rows] });
        await open(p);
        expect(mainText(), p).not.toMatch(/NaN|Infinity|undefined|\[object/);
        cleanup();
      }
      expect(weeklyRate([...rows])).toBeNull();
      seedStore('empty', 'lbs');
      useStore.setState({ weights: [...rows] });
      await open('/results?tab=journey');
      expect(mainText()).toMatch(/Needs 3\+ weigh-ins over 2\+ weeks/);
      expect(mainText()).not.toMatch(/Reached|Around|If your recent pace continues/);
    });
  }

  it('3 weigh-ins spanning 14 days do produce a pace and a labelled projection', async () => {
    seedStore('empty', 'lbs');
    useStore.setState({ weights: [w('a', 15, 204), w('b', 8, 202), w('c', 1, 200)] });
    await open('/results?tab=journey');
    expect(mainText()).toMatch(/Trend of 3 weigh-ins over 14 days/);
    expect(mainText()).toMatch(/If your recent pace continues/);
  });
});

describe('goal reached / going the wrong way', () => {
  it('latest weight below goal: says reached, 0 left, no negative or projected date', async () => {
    seedStore('empty', 'lbs');
    useStore.setState({ weights: [w('a', 30, 200), w('b', 15, 185), w('c', 1, 168)] });
    await open('/results?tab=journey');
    expect(mainText()).toContain('Reached');
    expect(mainText()).toMatch(/0\.0 lbs to go/);
    expect(mainText()).not.toMatch(/-\d+\.\d lbs to go/);
    cleanup();
    await open('/health');
    expect(mainText()).toMatch(/reached your goal weight/);
  });

  it('weight going up: trending up, no goal date, no "ahead"/celebration wording', async () => {
    seedStore('empty', 'lbs');
    useStore.setState({ weights: [w('a', 28, 196), w('b', 14, 199), w('c', 1, 202)], settings: { ...useStore.getState().settings, startingWeight: 196 } });
    await open('/results?tab=journey');
    expect(mainText()).toContain('Trending up');
    expect(mainText()).toMatch(/flat or moving away from your goal/);
    expect(mainText()).not.toMatch(/Reached|Around|great|congrat/i);
    cleanup();
    await open('/');
    expect(mainText()).toMatch(/\+6\.0/); // shown as a plain increase (196 -> 202), no shaming wording
  });
});

describe('backup portability across display units', () => {
  it('a backup made on a kg device restores on a lbs device with exact stored pounds; the unit preference follows the backup', async () => {
    seedStore('empty', 'kg');
    useStore.setState({ weights: [{ id: 'k', date: isoDaysAgo(1), weightLbs: 198.4160 }] });
    const s = useStore.getState();
    const text = JSON.stringify(createBackup({ settings: s.settings, doses: s.doses, weights: s.weights, effects: s.effects }));
    seedStore('empty', 'lbs');
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      useStore.getState().replaceAllData(parsed.data);
      expect(useStore.getState().weights[0].weightLbs).toBe(198.416);
      expect(useStore.getState().settings.weightUnit).toBe('kg');
    }
    await open('/weight');
    expect(mainText()).toMatch(/90\.0\s*kg/);
  });
});

describe('calendar weights follow the display unit', () => {
  it('shows kilograms in kg mode, converted and labelled', async () => {
    seedStore('empty', 'kg');
    useStore.setState({ weights: [{ id: 'k', date: isoDaysAgo(1), weightLbs: 220.462 }] });
    await open('/calendar');
    expect(mainText()).toContain('100.0 kg');
  });
});

describe('daylight-saving boundaries (run with TZ=America/New_York)', () => {
  const inNY = Intl.DateTimeFormat().resolvedOptions().timeZone === 'America/New_York';
  it.skipIf(!inNY)('01:30 on spring-forward day keeps date and time', () => {
    const iso = localDateTimeToIso('2026-03-08', '01:30');
    expect(isoToLocalDateString(iso)).toBe('2026-03-08');
    expect(isoToLocalTimeString(iso)).toBe('01:30');
  });
  it.skipIf(!inNY)('02:30 does not exist that day: JS silently moves it to 03:30 (documented behaviour)', () => {
    const iso = localDateTimeToIso('2026-03-08', '02:30');
    expect(isoToLocalDateString(iso)).toBe('2026-03-08');
    expect(isoToLocalTimeString(iso)).toBe('03:30');
  });
  it.skipIf(!inNY)('weekly next-dose counting across the change is by calendar days', () => {
    const iso = localDateTimeToIso('2026-03-05', '09:00'); // Thursday before DST
    const now = new Date(2026, 2, 9, 12); // Monday after DST
    const info = nextDoseInfo([dose('a', iso)], now);
    expect(info.daysUntil).toBe(3); // due Thursday 12 March
  });
  it.skipIf(!inNY)('a dose logged on the fall-back day at 01:30 maps to the same calendar day', () => {
    const iso = localDateTimeToIso('2026-11-01', '01:30');
    expect(isoToLocalDateString(iso)).toBe('2026-11-01');
  });
});
