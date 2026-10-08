import { format } from 'date-fns';
import type { DoseEvent, EffectEntry, WeightEntry, UserSettings } from '../types';
import type { PeriodRange } from '../lib/reports';
import { COLLECTED_FIELDS, severityLabel } from '../lib/symptoms';
import { formatWeight, getWeightUnit } from '../lib/units';

const time = (date: string) => format(new Date(date), 'yyyy-MM-dd HH:mm');
const notes = (text: string) => text || 'Not recorded';
/** Original entries, never peak-per-day aggregates. Explicit none is retained; omitted fields stay unrecorded. */
export function recordedRatings(entry: EffectEntry): Array<[string, string]> {
  const labels: Record<string, string> = Object.fromEntries(COLLECTED_FIELDS.map(f => [f.key, f.label]));
  Object.assign(labels, { cravings: 'Cravings', mood: 'Mood', energy: 'Energy', dehydration: 'Dehydration', indigestion: 'Indigestion', insomnia: 'Insomnia' });
  const fields: Array<[string, string]> = Object.entries(labels).filter(([key]) => entry[key as keyof EffectEntry] !== undefined)
    .map(([key, label]) => [label, severityLabel(entry[key as keyof EffectEntry] as EffectEntry['nausea'])]);
  for (const [name, value] of Object.entries(entry.customEffects ?? {})) fields.push([`Custom: ${name}`, severityLabel(value)]);
  return fields;
}

export function DoctorRecords({ doses, weights, effects, settings, range }: { doses: DoseEvent[]; weights: WeightEntry[]; effects: EffectEntry[]; settings: UserSettings; range: PeriodRange }) {
  const inside = <T extends {date: string},>(entries: T[]) => entries.filter(e => { const t = new Date(e.date).getTime(); return t >= range.start.getTime() && t <= range.end.getTime(); }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const w = inside(weights), d = inside(doses), e = inside(effects);
  const unit = getWeightUnit(settings);
  return <section aria-labelledby="doctor-records" className="bg-white p-6 rounded-[24px] border border-line space-y-5 doctor-records">
    <h2 id="doctor-records" className="text-lg font-semibold">Records to discuss with your clinician</h2>
    <p className="text-sm text-muted">Self-reported entries for the selected period. Missing entries do not mean no symptoms or no doses. This report does not verify a prescription or recommend treatment.</p>
    <p className="text-xs text-muted">Dates and times use this browser’s timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Medication names describe what was logged; the exact product, route and prescription need clinician verification.</p>
    <h3 className="font-semibold">Weigh-ins ({w.length})</h3>
    {w.length ? <table className="w-full text-sm"><caption className="sr-only">Individual weigh-ins</caption><thead><tr><th scope="col">Local date/time</th><th scope="col">Weight ({unit})</th></tr></thead><tbody>{w.map(row => <tr key={row.id}><td>{time(row.date)}</td><td>{formatWeight(row.weightLbs, unit)}</td></tr>)}</tbody></table> : <p>No weigh-ins recorded.</p>}
    <h3 className="font-semibold">Individual doses ({d.length})</h3>
    {d.length ? <ul className="space-y-4">{d.map(row => <li key={row.id} className="space-y-1"><p>{time(row.date)} · {row.medication} · {row.amountMg} mg · {row.site || 'Site not recorded'}</p><p>Injection-site discomfort: {row.painLevel == null ? 'Not recorded' : `${row.painLevel}/10 (self-reported)`}</p><p className="whitespace-pre-wrap break-words">Notes: {notes(row.notes)}</p></li>)}</ul> : <p>No doses recorded.</p>}
    <h3 className="font-semibold">Individual symptom logs ({e.length})</h3>
    {e.length ? <ul className="space-y-4">{e.map(row => <li key={row.id} className="space-y-1"><p className="font-semibold">{time(row.date)}</p><p>{recordedRatings(row).map(([name, rating]) => `${name}: ${rating}`).join('; ') || 'No ratings recorded'}. All other ratings: not recorded.</p><p className="whitespace-pre-wrap break-words">Notes: {notes(row.notes)}</p></li>)}</ul> : <p>No symptom logs recorded.</p>}
    <p className="text-xs text-muted">This printed/PDF copy is unencrypted and may contain sensitive notes. Review it before saving or sharing. It is a selected-period report, not a backup.</p>
  </section>;
}
