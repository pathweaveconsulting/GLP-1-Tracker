import { describe, it, expect } from 'vitest';
import { escapeCell, neutralizeFormula, parseCsv, toCsv } from './csv';

describe('toCsv', () => {
  it('starts with a UTF-8 BOM, uses CRLF and ends with a newline', () => {
    const out = toCsv([['a', 'b'], ['1', '2']]);
    expect(out.charCodeAt(0)).toBe(0xfeff);
    expect(out.slice(1)).toBe('a,b\r\n1,2\r\n');
    expect(toCsv([['a']], { bom: false })).toBe('a\r\n');
  });
  it('quotes fields with commas, quotes and newlines (RFC 4180)', () => {
    expect(escapeCell('a,b')).toBe('"a,b"');
    expect(escapeCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCell('line1\nline2')).toBe('"line1\nline2"');
    expect(escapeCell('plain')).toBe('plain');
    expect(escapeCell(null)).toBe('');
    expect(escapeCell(undefined)).toBe('');
  });
  it('writes numbers as-is, including negatives, and blanks non-finite ones', () => {
    expect(escapeCell(-2.5)).toBe('-2.5');
    expect(escapeCell(Number.NaN)).toBe('');
    expect(escapeCell(Infinity)).toBe('');
  });
});

describe('formula injection', () => {
  it('prefixes text that starts with = + - @ tab or CR', () => {
    for (const c of ['=SUM(A1)', '+1', '-1+1', '@cmd', '\tfoo', '\rfoo']) expect(neutralizeFormula(c)).toBe(`'${c}`);
    expect(neutralizeFormula('safe =x')).toBe('safe =x');
  });
  it('applies inside escapeCell, before quoting', () => {
    expect(escapeCell('=HYPERLINK("http://evil","x")')).toBe(`"'=HYPERLINK(""http://evil"",""x"")"`);
    expect(escapeCell('-note')).toBe("'-note");
  });
});

describe('parseCsv', () => {
  it('round-trips awkward cells', () => {
    const rows = [['Type', 'Notes'], ['Dose', 'a,b'], ['Dose', 'quote " inside'], ['Dose', 'multi\r\nline'], ['Dose', '']];
    const parsed = parseCsv(toCsv(rows));
    expect(parsed).toEqual(rows.map((r) => r.map((c) => (c === 'multi\r\nline' ? 'multi\r\nline' : c))));
  });
  it('handles BOM, LF-only files and a missing trailing newline', () => {
    expect(parseCsv('﻿a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
  });
  it('keeps empty fields and drops blank lines', () => {
    expect(parseCsv('a,,c\n\n1,2,\n')).toEqual([['a', '', 'c'], ['1', '2', '']]);
  });
  it('does not truncate at "#"', () => {
    expect(parseCsv('note\nfeel #great today')).toEqual([['note'], ['feel #great today']]);
  });
});
