/**
 * Date helpers that keep "a calendar day" a calendar day in the user's own timezone.
 *
 * `new Date('2026-03-05')` is UTC midnight, which is the previous evening west of UTC,
 * and `toISOString().split('T')[0]` for "today" flips to tomorrow in the evening.
 * Date-only entries are therefore anchored at LOCAL NOON, which is the same calendar
 * day in every timezone offset between -12h and +12h of where it was entered.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD for the local calendar day of `date`. */
export function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * `date` plus `days` calendar days, keeping the local wall-clock time (so a clock change in between
 * doesn't move it a day). Any fraction of a day is added as elapsed time.
 */
export function addCalendarDays(date: Date, days: number): Date {
  const whole = Math.floor(days);
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + whole);
  return new Date(d.getTime() + (days - whole) * 86_400_000);
}

export function todayLocalDateString(now: Date = new Date()): string {
  return toLocalDateString(now);
}

export function parseDateOnly(dateStr: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const check = new Date(y, m - 1, d);
  if (check.getFullYear() !== y || check.getMonth() !== m - 1 || check.getDate() !== d) return null;
  return { y, m, d };
}

/** 'YYYY-MM-DD' -> ISO instant at local noon on that day. */
export function dateOnlyToIso(dateStr: string): string {
  const parts = parseDateOnly(dateStr);
  if (!parts) throw new RangeError(`Invalid date: ${dateStr}`);
  return new Date(parts.y, parts.m - 1, parts.d, 12, 0, 0, 0).toISOString();
}

/** ISO instant -> the local 'YYYY-MM-DD' it falls on. */
export function isoToLocalDateString(iso: string): string {
  return toLocalDateString(new Date(iso));
}

/** Local 'HH:mm' of an ISO instant. */
export function isoToLocalTimeString(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Local wall-clock date + 'HH:mm' -> ISO instant. */
export function localDateTimeToIso(dateStr: string, timeStr: string): string {
  const parts = parseDateOnly(dateStr);
  const t = /^(\d{2}):(\d{2})$/.exec(timeStr);
  if (!parts || !t) throw new RangeError(`Invalid date/time: ${dateStr} ${timeStr}`);
  return new Date(parts.y, parts.m - 1, parts.d, Number(t[1]), Number(t[2]), 0, 0).toISOString();
}

/** Current local time as 'HH:mm'. */
export function nowLocalTimeString(now: Date = new Date()): string {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/** Whole local calendar days from `a` to `b` (positive when b is later). DST-safe. */
export function localDayDiff(a: Date | string, b: Date | string): number {
  const da = new Date(a);
  const db = new Date(b);
  const ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((ub - ua) / 86_400_000);
}

/**
 * If the chosen local date/time falls in a daylight-saving gap (e.g. 02:30 on the US spring-forward day), the clock
 * skips it and JavaScript silently moves it forward. Returns the 'HH:mm' it will really be saved as, or null when the
 * time exists (or the input is invalid).
 */
export function dstGapAdjustment(dateStr: string, timeStr: string): string | null {
  if (!parseDateOnly(dateStr) || !/^\d{2}:\d{2}$/.test(timeStr)) return null;
  const iso = localDateTimeToIso(dateStr, timeStr);
  const saved = isoToLocalTimeString(iso);
  return saved !== timeStr || isoToLocalDateString(iso) !== dateStr ? saved : null;
}
