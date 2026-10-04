import { describe, it, expect } from 'vitest';
import { dateOnlyToIso, isoToLocalDateString, isoToLocalTimeString, localDateTimeToIso, localDayDiff, nowLocalTimeString, parseDateOnly, todayLocalDateString, toLocalDateString } from './dates';

// These assertions hold in every timezone; CI runs the suite under several TZ values.
describe('dateOnlyToIso (local noon anchor)', () => {
  const samples = ['2026-01-01', '2026-03-05', '2026-03-08', '2026-03-29', '2026-10-25', '2026-11-01', '2028-02-29', '2026-12-31'];
  it('lands on the same calendar day for every sample, at 12:00 local', () => {
    for (const day of samples) {
      const iso = dateOnlyToIso(day);
      const d = new Date(iso);
      expect(isoToLocalDateString(iso)).toBe(day);
      expect([d.getHours(), d.getMinutes()]).toEqual([12, 0]);
    }
  });
  it('is what the old UTC-midnight approach was not: never the previous day', () => {
    const naive = new Date('2026-03-05').toISOString(); // UTC midnight
    // In zones west of UTC the naive value is Mar 4 locally; ours must always be Mar 5.
    expect(isoToLocalDateString(dateOnlyToIso('2026-03-05'))).toBe('2026-03-05');
    if (new Date().getTimezoneOffset() > 0) expect(isoToLocalDateString(naive)).toBe('2026-03-04');
  });
  it('rejects invalid calendar dates', () => {
    for (const bad of ['2026-02-30', '2026-13-01', 'yesterday', '', '2026-1-1']) {
      expect(parseDateOnly(bad)).toBeNull();
      expect(() => dateOnlyToIso(bad)).toThrow(RangeError);
    }
  });
});

describe('todayLocalDateString', () => {
  it('follows the local clock, including late evening and just after midnight', () => {
    expect(todayLocalDateString(new Date(2026, 0, 31, 23, 30))).toBe('2026-01-31'); // toISOString() would say Feb 1 west of UTC
    expect(todayLocalDateString(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01'); // toISOString() would say Dec 31 east of UTC
    expect(toLocalDateString(new Date(2026, 5, 9, 12))).toBe('2026-06-09');
  });
});

describe('localDateTimeToIso', () => {
  it('keeps the wall-clock date and time the user typed', () => {
    const iso = localDateTimeToIso('2026-03-05', '21:30');
    const d = new Date(iso);
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 3, 5, 21, 30]);
    expect(isoToLocalDateString(iso)).toBe('2026-03-05');
    expect(isoToLocalTimeString(iso)).toBe('21:30');
  });
  it('round-trips a late-evening dose onto the same day', () => {
    expect(isoToLocalDateString(localDateTimeToIso('2026-07-04', '23:59'))).toBe('2026-07-04');
    expect(isoToLocalDateString(localDateTimeToIso('2026-07-04', '00:01'))).toBe('2026-07-04');
  });
  it('rejects malformed input', () => {
    expect(() => localDateTimeToIso('2026-07-04', '9:5')).toThrow(RangeError);
    expect(() => localDateTimeToIso('nope', '09:05')).toThrow(RangeError);
  });
  it('formats the current local time as HH:mm', () => {
    expect(nowLocalTimeString(new Date(2026, 0, 1, 7, 5))).toBe('07:05');
  });
});

describe('localDayDiff', () => {
  it('counts calendar days across DST changes', () => {
    expect(localDayDiff(new Date(2026, 2, 8, 12), new Date(2026, 2, 9, 12))).toBe(1);
    expect(localDayDiff(new Date(2026, 9, 31, 23, 0), new Date(2026, 10, 1, 1, 0))).toBe(1);
    expect(localDayDiff(new Date(2026, 5, 15, 1), new Date(2026, 5, 15, 23))).toBe(0);
    expect(localDayDiff(new Date(2026, 5, 15), new Date(2026, 5, 10))).toBe(-5);
  });
});
