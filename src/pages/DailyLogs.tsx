import { useState } from 'react';
import { dailyLogsEnabled } from '../lib/features';
import { dailyForm } from '../lib/dailyLogs';
import { todayLocalDateString } from '../lib/dates';
import { saveDailyLog, useDailyLogs } from '../store/dailyLogs';
import { buttonClass, EmptyState, errorClass, helpClass, inputClass, labelClass, noteClass, PageHeader, Panel } from '../components/ds';

export function DailyLogs() {
  const {rows,error} = useDailyLogs();
  const today = todayLocalDateString();
  const initial = rows.find(row => row.date === today);
  const [date,setDate] = useState(today);
  const [protein,setProtein] = useState(initial?.proteinGrams?.toString() ?? '');
  const [water,setWater] = useState(initial?.waterMl?.toString() ?? '');
  const [notes,setNotes] = useState(initial?.notes ?? '');
  const [message,setMessage] = useState('');
  const [failure,setFailure] = useState('');
  const [saving,setSaving] = useState(false);
  const load = (day: string) => { const row=rows.find(e => e.date===day);setDate(day);setProtein(row?.proteinGrams?.toString() ?? '');setWater(row?.waterMl?.toString() ?? '');setNotes(row?.notes ?? '');setMessage('');setFailure(''); };
  const enabled = dailyLogsEnabled();
  return <div className="space-y-5">
    <PageHeader title="Protein & water" description="Daily totals to discuss alongside your symptoms. Saving the same date replaces that day’s totals. Blank means not recorded; zero means you recorded zero. The app does not set an intake target." />
    {error && <p role="alert" className={noteClass('danger', 'text-sm')}>{error} Your original encrypted bytes are kept. Download an encrypted backup from Settings before attempting recovery. New daily saves are paused.</p>}
    {enabled && !error && <Panel title="Record daily totals"><form noValidate className="space-y-4" onSubmit={async event => {
      event.preventDefault();setFailure('');setMessage('');
      try { const row = dailyForm(date,protein,water,notes);setSaving(true);await saveDailyLog(row);setMessage('Daily totals saved in your encrypted vault.'); }
      catch(error) {setFailure((error instanceof Error ? error.message : 'Daily save failed.')+' If saving failed, keep this tab open and download an encrypted backup from Settings.');}
      finally {setSaving(false);}
    }}>
      <label className={`${labelClass} max-w-xs`}>Date<input aria-label="Daily date" type="date" max={today} value={date} disabled={saving} onChange={event=>load(event.target.value)} className={inputClass('mt-1.5 font-normal')} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>Protein (g)<input aria-label="Protein (g)" type="text" inputMode="decimal" value={protein} disabled={saving} onChange={event=>setProtein(event.target.value)} aria-describedby="daily-input-help" className={inputClass('mt-1.5 font-normal tabular-nums')} /></label>
        <label className={labelClass}>Water (mL)<input aria-label="Water (mL)" type="text" inputMode="decimal" value={water} disabled={saving} onChange={event=>setWater(event.target.value)} aria-describedby="daily-input-help" className={inputClass('mt-1.5 font-normal tabular-nums')} /></label>
      </div>
      <p id="daily-input-help" className={helpClass}>Optional fields. Use digits and a decimal point. Input limits are technical limits, not recommended intake. Agree personal nutrition and fluid goals with your clinician.</p>
      <label className={labelClass}>Notes<textarea aria-label="Daily notes" maxLength={10000} value={notes} disabled={saving} onChange={event=>setNotes(event.target.value)} className={inputClass('mt-1.5 font-normal')} /></label>
      {failure && <p role="alert" className={errorClass}>{failure}</p>}
      {message && <p role="status" className="text-sm text-positive">{message}</p>}
      <button disabled={saving} type="submit" className={buttonClass('primary')}>{saving ? 'Saving…' : rows.some(e=>e.date===date) ? 'Update daily totals' : 'Save daily totals'}</button>
    </form></Panel>}
    {!enabled && <p className={noteClass('neutral', 'text-sm')}>Daily entry is not enabled in this release. Previously recorded totals remain available below and in exports.</p>}
    <section aria-labelledby="daily-history" className="rounded-[var(--radius-panel)] border border-line bg-surface p-4 sm:p-5"><h2 id="daily-history" className="mb-3 text-[15px] font-semibold text-ink">Recorded daily totals</h2>
      {!rows.length ? <EmptyState title="No daily totals recorded">Unlogged days are not zero.</EmptyState> : <ul className="-my-1 divide-y divide-line">{[...rows].reverse().map(row=><li key={row.date} className="flex flex-wrap items-start justify-between gap-3 py-3"><div className="min-w-0 space-y-0.5"><h3 className="text-[15px] font-semibold text-ink">{row.date}</h3><p className="text-sm tabular-nums text-ink-2">Protein: {row.proteinGrams===undefined?'Not recorded':`${row.proteinGrams} g`} · Water: {row.waterMl===undefined?'Not recorded':`${row.waterMl} mL`}</p>{row.notes && <p className="whitespace-pre-wrap break-words text-sm text-muted">{row.notes}</p>}</div>{enabled && !error && <button type="button" disabled={saving} aria-label={`Edit daily totals for ${row.date}`} onClick={()=>load(row.date)} className={buttonClass('secondary', 'sm')}>Edit daily totals</button>}</li>)}</ul>}
    </section>
  </div>;
}
