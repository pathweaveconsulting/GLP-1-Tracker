import { describe, it, expect } from 'vitest';
import { importWeightsCsv, parseImportDate } from './weightImport';
import { isoToLocalDateString } from './dates';

const none = { existing: [], defaultUnit: 'lbs' as const };
const days = (r: ReturnType<typeof importWeightsCsv>) => r.rows.map((x) => isoToLocalDateString(x.date));

describe('parseImportDate', () => {
  it('reads ISO and day-first dates', () => {
    expect(parseImportDate('2026-03-05')).toBe('2026-03-05');
    expect(parseImportDate('2026-3-5')).toBe('2026-03-05');
    expect(parseImportDate('05/03/2026')).toBe('2026-03-05');
    expect(parseImportDate('5-3-2026')).toBe('2026-03-05');
    expect(parseImportDate('25.12.2026')).toBe('2026-12-25');
    expect(parseImportDate('2026-03-05 08:30')).toBe('2026-03-05');
  });
  it('rejects impossible or unrecognised dates', () => {
    for (const bad of ['', 'x', '31/02/2026', '2026-02-30', '13/13/2026', '3/5/26']) expect(parseImportDate(bad)).toBeNull();
  });
});

describe('importWeightsCsv', () => {
  it('finds columns from the header and detects kg from it', () => {
    const r = importWeightsCsv('Date,Weight (kg)\n2026-03-01,90.5\n2026-03-08,89.8', none);
    expect(r.errors).toEqual([]);
    expect(r.unit).toBe('kg');
    expect(r.unitSource).toBe('header');
    expect(r.rows[0].weightLbs).toBeCloseTo(90.5 * 2.2046226, 3);
    expect(days(r)).toEqual(['2026-03-01', '2026-03-08']);
  });
  it('detects lb from the header and works with other column orders and BOM', () => {
    const r = importWeightsCsv('﻿notes,weight_lbs,Day\nhi,201.2,01/03/2026', { existing: [], defaultUnit: 'kg' });
    expect(r.unit).toBe('lbs');
    expect(r.rows[0].weightLbs).toBeCloseTo(201.2);
    expect(days(r)).toEqual(['2026-03-01']);
  });
  it('detects units from a unit column and from value suffixes', () => {
    const col = importWeightsCsv('date,weight,unit\n2026-03-01,90,kg\n2026-03-02,89.5,kg', none);
    expect(col.unit).toBe('kg');
    expect(col.rows).toHaveLength(2);
    const suffix = importWeightsCsv('date,weight\n2026-03-01,90 kg', none);
    expect(suffix.rows[0].weightLbs).toBeCloseTo(198.4, 1);
  });
  it('guesses kg from values that are impossible in pounds, and says so', () => {
    const r = importWeightsCsv('date,weight\n2026-03-01,30\n2026-03-02,31', none);
    expect(r.unit).toBe('kg');
    expect(r.unitSource).toBe('values');
  });
  it('skips and counts unreadable rows', () => {
    const r = importWeightsCsv('date,weight (lbs)\n2026-03-01,200\nnot a date,199\n2026-03-03,abc\n2026-03-04,5000\n2026-03-05,198', none);
    expect(r.rows).toHaveLength(2);
    expect(r.skipped).toBe(3);
  });
  it('accepts a decimal comma', () => {
    expect(importWeightsCsv('date,weight (kg)\n2026-03-01,"82,5"', none).rows[0].weightLbs).toBeCloseTo(82.5 * 2.2046226, 3);
  });
  it('removes duplicates against existing entries and within the file', () => {
    const existing = [{ id: 'w', date: new Date(2026, 2, 1, 9).toISOString(), weightLbs: 200 }];
    const r = importWeightsCsv('date,weight (lbs)\n2026-03-01,200\n2026-03-02,199\n2026-03-02,199\n2026-03-01,150', { existing, defaultUnit: 'lbs' });
    expect(r.duplicates).toBe(2);
    expect(days(r)).toEqual(['2026-03-02', '2026-03-01']); // a different weight on the same day is kept
  });
  it('reports a clear error when the columns can’t be found', () => {
    const r = importWeightsCsv('foo,bar\n1,2', none);
    expect(r.errors[0]).toMatch(/Couldn’t find the columns/);
    expect(r.rows).toEqual([]);
    expect(importWeightsCsv('date,weight', none).errors[0]).toMatch(/header row and at least one data row/);
  });
  it('round-trips our own tidy export header shape', () => {
    // The tidy export is long-format (Type,Date,Item,Value,Unit...). A weight-only slice imports with its Unit column.
    const r = importWeightsCsv('Date,Value,Unit\n2026-03-05,100,kg', none);
    expect(r.unit).toBe('kg');
    expect(r.rows).toHaveLength(1);
  });
});
