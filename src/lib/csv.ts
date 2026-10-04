/** RFC 4180 CSV writing/parsing, with spreadsheet formula-injection protection and a UTF-8 BOM for Excel. */

export type CsvCell = string | number | null | undefined;

const BOM = '﻿';
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * Text cells that a spreadsheet could interpret as a formula get a leading apostrophe.
 * Real numbers (typeof number) are written as-is, so negative values stay numeric.
 */
export function neutralizeFormula(text: string): string {
  return FORMULA_START.test(text) ? `'${text}` : text;
}

export function escapeCell(cell: CsvCell): string {
  if (cell == null) return '';
  const raw = typeof cell === 'number' ? (Number.isFinite(cell) ? String(cell) : '') : neutralizeFormula(cell);
  return /[",\r\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export function toCsv(rows: CsvCell[][], opts: { bom?: boolean } = {}): string {
  const body = rows.map((r) => r.map(escapeCell).join(',')).join('\r\n') + '\r\n';
  return (opts.bom === false ? '' : BOM) + body;
}

/** Parse CSV text into rows of strings. Handles a BOM, quoted fields, doubled quotes, CRLF/LF and embedded newlines. */
export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"' && field === '') { inQuotes = true; i++; continue; }
    if (ch === ',') { pushField(); i++; continue; }
    if (ch === '\r') { if (text[i + 1] === '\n') i++; pushRow(); i++; continue; }
    if (ch === '\n') { pushRow(); i++; continue; }
    field += ch; i++;
  }
  if (field !== '' || row.length > 0) pushRow();
  // Drop completely blank lines.
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

/** Download text as a file via a Blob (a data: URI breaks on '#' and large files). */
export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
