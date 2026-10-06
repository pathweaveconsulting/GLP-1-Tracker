import { describe, it, expect } from 'vitest';
import { importWeightsCsv, MAX_IMPORT_BYTES, MAX_IMPORT_ROWS } from './weightImport';

const csvOf = (n: number, sameDay = false) =>
  'Date,Weight (lbs)\n' +
  Array.from({ length: n }, (_, i) => {
    const d = sameDay ? new Date(2020, 0, 1) : new Date(1990 + (i % 35), (i >> 5) % 12, 1 + (i % 28));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')},${100 + (i % 400) + i / 100000}`;
  }).join('\n');

describe('F3: weight import scales linearly and is capped', () => {
  it('imports 20,000 rows in under 500 ms', () => {
    const csv = csvOf(20000);
    const t = performance.now();
    const r = importWeightsCsv(csv, { existing: [], defaultUnit: 'lbs' });
    const ms = performance.now() - t;
    expect(r.rows.length).toBeGreaterThan(19000);
    expect(ms).toBeLessThan(500);
  });

  it('50,000 rows (the cap) with 20,000 existing entries is still fast', () => {
    const existing = Array.from({ length: 20000 }, (_, i) => ({ id: `e${i}`, date: new Date(1950 + (i % 40), (i >> 5) % 12, 1 + (i % 28), 12).toISOString(), weightLbs: 150 }));
    const t = performance.now();
    const r = importWeightsCsv(csvOf(50000), { existing, defaultUnit: 'lbs' });
    expect(performance.now() - t).toBeLessThan(2500);
    expect(r.errors).toEqual([]);
  });

  it('many rows on the same day do not go quadratic either', () => {
    const t = performance.now();
    importWeightsCsv(csvOf(20000, true), { existing: [], defaultUnit: 'lbs' });
    // every row is a different weight on one day: the per-day list grows, so allow more time but not quadratic blow-up
    expect(performance.now() - t).toBeLessThan(5000);
  });

  it('refuses files over 5 MB before parsing, with a readable message', () => {
    const big = 'Date,Weight (lbs)\n' + '2026-03-01,200\n'.repeat(Math.ceil((MAX_IMPORT_BYTES + 10) / 15));
    const t = performance.now();
    const r = importWeightsCsv(big, { existing: [], defaultUnit: 'lbs' });
    expect(performance.now() - t).toBeLessThan(200);
    expect(r.rows).toEqual([]);
    expect(r.errors[0]).toMatch(/too large.*5 MB/i);
  });

  it('refuses more than 50,000 data rows', () => {
    const r = importWeightsCsv(csvOf(MAX_IMPORT_ROWS + 1), { existing: [], defaultUnit: 'lbs' });
    expect(r.rows).toEqual([]);
    expect(r.errors[0]).toMatch(/50,000 rows/);
    expect(importWeightsCsv(csvOf(MAX_IMPORT_ROWS), { existing: [], defaultUnit: 'lbs' }).errors).toEqual([]);
  });

  it('R8: the row cap also applies to CR-only (old Mac) and mixed line endings; CRLF counts once', () => {
    const run = (text: string) => importWeightsCsv(text, { existing: [], defaultUnit: 'lbs' });
    expect(run(csvOf(60000).replace(/\n/g, '\r')).errors[0]).toMatch(/50,000 rows/);
    expect(run(csvOf(MAX_IMPORT_ROWS + 1).replace(/\n/g, '\r\n')).errors[0]).toMatch(/50,000 rows/);
    expect(run(csvOf(MAX_IMPORT_ROWS + 1).replace(/\n/g, '\r')).errors[0]).toMatch(/50,000 rows/);
    // exactly at the cap is fine in every style, including a trailing line break
    expect(run(csvOf(MAX_IMPORT_ROWS).replace(/\n/g, '\r')).errors).toEqual([]);
    expect(run(csvOf(MAX_IMPORT_ROWS).replace(/\n/g, '\r\n') + '\r\n').errors).toEqual([]);
    expect(run(csvOf(MAX_IMPORT_ROWS) + '\r').errors).toEqual([]);
  });

  it('duplicate rule is unchanged: same day and same weight (within 0.1 lb) are skipped, other weights kept', () => {
    const existing = [{ id: 'a', date: new Date(2026, 2, 1, 9).toISOString(), weightLbs: 200 }];
    const r = importWeightsCsv('date,weight (lbs)\n2026-03-01,200.01\n2026-03-01,200.09\n2026-03-01,200.2\n2026-03-02,200\n2026-03-02,200', { existing, defaultUnit: 'lbs' });
    expect(r.duplicates).toBe(3); // 200.01, 200.09 vs existing; second 2026-03-02 vs first
    expect(r.rows).toHaveLength(2);
  });
});
