import type { DoseEvent, EffectEntry, WeightEntry } from '../types';
import { formatWeight, WeightUnit } from './units';
import { isoToLocalDateString, isoToLocalTimeString } from './dates';
import { CsvCell, toCsv } from './csv';
import { trackedFields, sevOf, severityLabel } from './symptoms';
import type { DailyLog } from './dailyLogs';

export const TIDY_HEADER = ['Type', 'Date', 'Item', 'Value', 'Unit', 'Details', 'Notes'] as const;

/** One tidy long-format table of everything the user logged, with weights in their chosen unit. */
export function buildTidyRows(args: { doses: DoseEvent[]; weights: WeightEntry[]; effects: EffectEntry[]; unit: WeightUnit; dailyLogs?: DailyLog[] }): CsvCell[][] {
  const { doses, weights, effects, unit } = args;
  const out: Array<{ t: number; row: CsvCell[] }> = [];
  const ms = (iso: string) => new Date(iso).getTime();
  for (const day of args.dailyLogs ?? []) {
    const [year,month,date] = day.date.split('-').map(Number);
    const t = new Date(year,month-1,date).getTime();
    const rows: CsvCell[][] = [];
    if (day.proteinGrams !== undefined) rows.push(['Daily',day.date,'Protein',day.proteinGrams,'g','Self-reported daily total','']);
    if (day.waterMl !== undefined) rows.push(['Daily',day.date,'Water',day.waterMl,'mL','Self-reported daily total','']);
    if (!rows.length) rows.push(['Daily',day.date,'Daily note','','','No totals recorded','']);
    rows[0][6] = day.notes;
    for (const row of rows) out.push({t,row});
  }

  for (const w of weights) {
    out.push({ t: ms(w.date), row: ['Weight', isoToLocalDateString(w.date), 'Weight', Number(formatWeight(w.weightLbs, unit, { unit: false })), unit, '', ''] });
  }
  for (const d of doses) {
    out.push({
      t: ms(d.date),
      row: ['Dose', isoToLocalDateString(d.date), d.medication, d.amountMg, 'mg', `Site: ${d.site}; Time: ${isoToLocalTimeString(d.date)}; Discomfort: ${d.painLevel == null ? 'not recorded' : `${d.painLevel}/10`}`, d.notes ?? ''],
    });
  }
  for (const e of effects) {
    const day = isoToLocalDateString(e.date);
    const present: Array<[string, string]> = [];
    trackedFields([e]).forEach((f) => { const s = sevOf(e, f.key); if (s != null) present.push([f.label, severityLabel(s)]); });
    Object.entries(e.customEffects ?? {}).forEach(([n, s]) => { if (s != null) present.push([n, severityLabel(s)]); });
    if (present.length === 0) {
      out.push({ t: ms(e.date), row: ['Symptom', day, 'Symptoms', 'Not recorded', 'severity', '', e.notes ?? ''] });
    } else {
      present.forEach(([label, sev], i) => out.push({ t: ms(e.date), row: ['Symptom', day, label, sev, 'severity', '', i === 0 ? e.notes ?? '' : ''] }));
    }
  }
  out.sort((a, b) => a.t - b.t);
  return out.map((o) => o.row);
}

export function buildTidyCsv(args: Parameters<typeof buildTidyRows>[0]): string {
  return toCsv([[...TIDY_HEADER], ...buildTidyRows(args)]);
}
