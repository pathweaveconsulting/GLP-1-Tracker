import { parseDateOnly, todayLocalDateString } from './dates';
export interface DailyLog { date: string; proteinGrams?: number; waterMl?: number; notes: string }
export const DAILY_FORMAT = 'glp1-daily-logs';
/** Technical input limits, not recommended intake or medical safety thresholds. */
export function validateDailyRows(value: unknown): DailyLog[] {
  if (!Array.isArray(value) || value.length > 50_000) throw new Error('Daily records must be a list of at most 50,000 days.');
  const days = new Set<string>();
  return value.map(row => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Unreadable daily record.');
    const e = row as Record<string,unknown>;
    if (Object.keys(e).some(k => !['date','proteinGrams','waterMl','notes'].includes(k))) throw new Error('Daily record contains unsupported fields. Update the app before restoring.');
    if (typeof e.date !== 'string' || !parseDateOnly(e.date) || days.has(e.date)) throw new Error('Daily dates must be valid and unique.');
    days.add(e.date);
    if (typeof e.notes !== 'string' || e.notes.length > 10_000) throw new Error('Daily notes must be text of at most 10,000 characters.');
    for (const key of ['proteinGrams','waterMl']) if (e[key] !== undefined && (typeof e[key] !== 'number' || !Number.isFinite(e[key]) || (e[key] as number) < 0 || (e[key] as number) > 100_000)) throw new Error('Daily totals must be finite numbers from 0 to 100,000, or omitted when not recorded.');
    if (e.proteinGrams === undefined && e.waterMl === undefined && !e.notes.trim()) throw new Error('Record a total or a note; an empty day is not a log.');
    return {date:e.date,notes:e.notes,...(e.proteinGrams !== undefined ? {proteinGrams:e.proteinGrams as number} : {}),...(e.waterMl !== undefined ? {waterMl:e.waterMl as number} : {})};
  });
}
export function serializeDailyLogs(rows: DailyLog[]): string { return JSON.stringify({format:DAILY_FORMAT,version:1,entries:validateDailyRows(rows)}); }
export function parseDailyLogs(raw: string | null): DailyLog[] {
  if (raw === null) return [];
  const e = JSON.parse(raw);
  if (!e || e.format !== DAILY_FORMAT || e.version !== 1) throw new Error('Unsupported daily-record format. Update the app or restore a verified backup.');
  return validateDailyRows(e.entries);
}
export function dailyForm(date: string, protein: string, water: string, notes: string): DailyLog {
  if (date > todayLocalDateString()) throw new Error('Choose today or an earlier date.');
  const number = (text: string) => { if (!/^\d+(\.\d+)?$/.test(text.trim())) throw new Error('Enter a number using digits and a decimal point, or leave the field blank.'); return Number(text); };
  return validateDailyRows([{date,notes,...(protein.trim() ? {proteinGrams:number(protein)} : {}),...(water.trim() ? {waterMl:number(water)} : {})}])[0];
}
