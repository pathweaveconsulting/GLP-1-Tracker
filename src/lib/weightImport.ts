import type { WeightEntry } from '../types';
import { parseCsv } from './csv';
import { LBS_PER_KG, WEIGHT_BOUNDS, WeightUnit } from './units';
import { dateOnlyToIso, isoToLocalDateString, parseDateOnly } from './dates';

export interface ImportedWeight {
  /** ISO instant (date-only inputs are anchored at local noon). */
  date: string;
  weightLbs: number;
}

export interface WeightImportResult {
  rows: ImportedWeight[];
  /** Data rows that could not be read (bad date, bad weight, out of range). */
  skipped: number;
  /** Rows that already exist (same day and weight) or repeat inside the file. */
  duplicates: number;
  unit: WeightUnit;
  /** How the unit was decided. */
  unitSource: 'header' | 'column' | 'values' | 'default';
  /** Fatal problems, e.g. no date or weight column. When non-empty `rows` is empty. */
  errors: string[];
}

/** Hard limits, checked before the file is parsed. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 50_000;
/** Two weights on the same day closer than this (lb) count as the same reading. */
const DUPLICATE_TOLERANCE_LBS = 0.1;

/** Lines in `text`, counting \n, \r and \r\n (as one) as breaks, so no line-ending style slips past the row cap. */
function countLines(text: string): number {
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 13 && text.charCodeAt(i + 1) === 10) i++;
    if (c === 10 || c === 13) n++;
  }
  const last = text.charCodeAt(text.length - 1);
  return text.length > 0 && last !== 10 && last !== 13 ? n + 1 : n;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Parse ISO (date or date-time) and day-first (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY) dates into a local 'YYYY-MM-DD'. */
export function parseImportDate(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (iso) {
    const s = `${iso[1]}-${pad(Number(iso[2]))}-${pad(Number(iso[3]))}`;
    return parseDateOnly(s) ? s : null;
  }
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(t)) {
    // Date-time: keep the date as written unless a timezone is present, in which case use the local day.
    if (/(Z|[+-]\d{2}:?\d{2})$/.test(t)) {
      const d = new Date(t);
      return Number.isNaN(d.getTime()) ? null : isoToLocalDateString(d.toISOString());
    }
    const s = t.slice(0, 10);
    return parseDateOnly(s) ? s : null;
  }
  const dmy = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})(?:[ T].*)?$/.exec(t);
  if (dmy) {
    const s = `${dmy[3]}-${pad(Number(dmy[2]))}-${pad(Number(dmy[1]))}`; // day-first
    return parseDateOnly(s) ? s : null;
  }
  return null;
}

function parseWeightCell(text: string): { value: number; unit: WeightUnit | null } | null {
  let t = text.trim().toLowerCase();
  if (!t) return null;
  let unit: WeightUnit | null = null;
  const suffix = /\s*(kg|kgs|kilograms?|lbs?|pounds?)\.?$/.exec(t);
  if (suffix) {
    unit = suffix[1].startsWith('k') ? 'kg' : 'lbs';
    t = t.slice(0, suffix.index).trim();
  }
  // "82,5" decimal comma (only when there is no other comma)
  if (/^\d+,\d{1,2}$/.test(t)) t = t.replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const value = Number(t);
  return Number.isFinite(value) ? { value, unit } : null;
}

const hasUnit = (h: string): WeightUnit | null =>
  /(^|[^a-z])(kgs?|kilograms?)([^a-z]|$)/.test(h) ? 'kg' : /(^|[^a-z])(lbs?|pounds?)([^a-z]|$)/.test(h) ? 'lbs' : null;

/**
 * Import weights from CSV. Header-driven: finds a date column and a weight column, detects kg/lb from the
 * header, a unit column or the values, skips (and counts) unreadable rows, and removes duplicates.
 */
export function importWeightsCsv(text: string, opts: { existing: WeightEntry[]; defaultUnit: WeightUnit }): WeightImportResult {
  const base: WeightImportResult = { rows: [], skipped: 0, duplicates: 0, unit: opts.defaultUnit, unitSource: 'default', errors: [] };
  if (text.length > MAX_IMPORT_BYTES) {
    return { ...base, errors: [`This file is too large to import (the limit is 5 MB). Split it into smaller files.`] };
  }
  if (countLines(text) - 1 > MAX_IMPORT_ROWS) {
    return { ...base, errors: [`This file has more than 50,000 rows, which is the most that can be imported at once. Split it into smaller files.`] };
  }
  const table = parseCsv(text);
  if (table.length < 2) return { ...base, errors: ['The file needs a header row and at least one data row.'] };

  const header = table[0].map((h) => h.trim().toLowerCase());
  const dateCol = header.findIndex((h) => /date|day|when|time/.test(h));
  let weightCol = header.findIndex((h, i) => i !== dateCol && /weight|wt\b|mass/.test(h));
  if (weightCol < 0) weightCol = header.findIndex((h, i) => i !== dateCol && (hasUnit(h) != null || /value|amount/.test(h)));
  const unitCol = header.findIndex((h) => h === 'unit' || h === 'units');
  if (dateCol < 0 || weightCol < 0) {
    return { ...base, errors: ['Couldn’t find the columns. The first row should name a date column (e.g. “Date”) and a weight column (e.g. “Weight (kg)”).'] };
  }

  let unit: WeightUnit = opts.defaultUnit;
  let unitSource: WeightImportResult['unitSource'] = 'default';
  const headerUnit = hasUnit(header[weightCol]);
  if (headerUnit) { unit = headerUnit; unitSource = 'header'; }

  const parsed: Array<{ day: string; value: number; unit: WeightUnit | null }> = [];
  let skipped = 0;
  for (const r of table.slice(1)) {
    const day = parseImportDate(r[dateCol] ?? '');
    const cell = parseWeightCell(r[weightCol] ?? '');
    if (!day || !cell) { skipped++; continue; }
    let cellUnit: WeightUnit | null = cell.unit;
    if (!cellUnit && unitCol >= 0) {
      const u = (r[unitCol] ?? '').trim().toLowerCase();
      cellUnit = u.startsWith('k') ? 'kg' : u.startsWith('l') || u.startsWith('p') ? 'lbs' : null;
    }
    parsed.push({ day, value: cell.value, unit: cellUnit });
  }

  if (!headerUnit) {
    const explicit = parsed.filter((p) => p.unit);
    if (explicit.length > 0) {
      const kg = explicit.filter((p) => p.unit === 'kg').length;
      unit = kg >= explicit.length / 2 ? 'kg' : 'lbs';
      unitSource = 'column';
    } else if (parsed.length > 0) {
      // No explicit unit anywhere. Values that would be impossible in the default unit but plausible in the other tell us.
      const inRange = (u: WeightUnit) => parsed.filter((p) => p.value >= WEIGHT_BOUNDS[u].min && p.value <= WEIGHT_BOUNDS[u].max).length;
      if (opts.defaultUnit === 'lbs' && inRange('lbs') < parsed.length / 2 && inRange('kg') > inRange('lbs')) { unit = 'kg'; unitSource = 'values'; }
      if (opts.defaultUnit === 'kg' && inRange('kg') < parsed.length / 2 && inRange('lbs') > inRange('kg')) { unit = 'lbs'; unitSource = 'values'; }
    }
  }

  // Duplicate lookup in O(1) per row: weights seen per local day, bucketed by tolerance so that only the
  // neighbouring buckets can contain a match.
  const seen = new Map<string, number[]>();
  const bucket = (lbs: number) => Math.round(lbs / DUPLICATE_TOLERANCE_LBS);
  const remember = (day: string, lbs: number) => {
    const key = `${day}|${bucket(lbs)}`;
    const list = seen.get(key);
    if (list) list.push(lbs);
    else seen.set(key, [lbs]);
  };
  const isDuplicate = (day: string, lbs: number) => {
    const b = bucket(lbs);
    for (let k = b - 1; k <= b + 1; k++) {
      const list = seen.get(`${day}|${k}`);
      if (list && list.some((w) => Math.abs(w - lbs) < DUPLICATE_TOLERANCE_LBS)) return true;
    }
    return false;
  };
  for (const w of opts.existing) remember(isoToLocalDateString(w.date), w.weightLbs);

  let duplicates = 0;
  const rows: ImportedWeight[] = [];
  for (const p of parsed) {
    const u = p.unit ?? unit;
    const { min, max } = WEIGHT_BOUNDS[u];
    if (p.value < min || p.value > max) { skipped++; continue; }
    const lbs = u === 'kg' ? p.value * LBS_PER_KG : p.value;
    if (isDuplicate(p.day, lbs)) { duplicates++; continue; }
    remember(p.day, lbs);
    rows.push({ date: dateOnlyToIso(p.day), weightLbs: lbs });
  }
  return { rows, skipped, duplicates, unit, unitSource, errors: [] };
}
