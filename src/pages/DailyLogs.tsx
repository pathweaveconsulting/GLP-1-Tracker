import { useState } from 'react';
import { dailyLogsEnabled } from '../lib/features';
import { dailyForm } from '../lib/dailyLogs';
import { todayLocalDateString } from '../lib/dates';
import { saveDailyLog, useDailyLogs } from '../store/dailyLogs';

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
  return <div className="space-y-6">
    <header><h1 className="text-3xl font-semibold">Daily protein & water</h1><p className="text-sm text-muted mt-2">Keep a record to discuss alongside your symptoms. Enter your daily totals; saving the same date replaces that day’s totals. Blank means not recorded, and zero means you explicitly recorded zero. The app does not set an intake target.</p></header>
    {error && <p role="alert" className="text-danger">{error} Your original encrypted bytes are kept. Download an encrypted backup from Settings before attempting recovery. New daily saves are paused.</p>}
    {enabled && !error && <form noValidate className="bg-white p-6 rounded-[24px] border border-[#E5E7EB] space-y-4" onSubmit={async event => {
      event.preventDefault();setFailure('');setMessage('');
      try { const row = dailyForm(date,protein,water,notes);setSaving(true);await saveDailyLog(row);setMessage('Daily totals saved in your encrypted vault.'); }
      catch(error) {setFailure((error instanceof Error ? error.message : 'Daily save failed.')+' If saving failed, keep this tab open and download an encrypted backup from Settings.');}
      finally {setSaving(false);}
    }}>
      <label className="block text-sm">Date<input aria-label="Daily date" type="date" max={today} value={date} disabled={saving} onChange={event=>load(event.target.value)} className="block w-full border rounded-xl p-3 mt-1" /></label>
      <label className="block text-sm">Protein (g)<input aria-label="Protein (g)" type="text" inputMode="decimal" value={protein} disabled={saving} onChange={event=>setProtein(event.target.value)} aria-describedby="daily-input-help" className="block w-full border rounded-xl p-3 mt-1" /></label>
      <label className="block text-sm">Water (mL)<input aria-label="Water (mL)" type="text" inputMode="decimal" value={water} disabled={saving} onChange={event=>setWater(event.target.value)} aria-describedby="daily-input-help" className="block w-full border rounded-xl p-3 mt-1" /></label>
      <p id="daily-input-help" className="text-xs text-muted">Optional fields. Use digits and a decimal point. Input limits are technical limits, not recommended intake. Agree personal nutrition and fluid goals with your clinician.</p>
      <label className="block text-sm">Notes<textarea aria-label="Daily notes" maxLength={10000} value={notes} disabled={saving} onChange={event=>setNotes(event.target.value)} className="block w-full border rounded-xl p-3 mt-1" /></label>
      {failure && <p role="alert" className="text-danger">{failure}</p>}
      {message && <p role="status">{message}</p>}
      <button disabled={saving} type="submit" className="min-h-11 px-4 py-3 rounded-xl bg-slate-900 text-white font-semibold focus-visible:ring-2 focus-visible:ring-[#6D4AFF]">{saving ? 'Saving…' : rows.some(e=>e.date===date) ? 'Update daily totals' : 'Save daily totals'}</button>
    </form>}
    {!enabled && <p className="text-sm text-muted">Daily entry is not enabled in this release. Previously recorded totals remain available below and in exports.</p>}
    <section aria-labelledby="daily-history"><h2 id="daily-history" className="text-lg font-semibold mb-3">Recorded daily totals</h2>
      {!rows.length ? <p>No daily totals recorded. Unlogged days are not zero.</p> : <ul className="space-y-3">{[...rows].reverse().map(row=><li key={row.date} className="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-1"><h3 className="font-semibold">{row.date}</h3><p>Protein: {row.proteinGrams===undefined?'Not recorded':`${row.proteinGrams} g`} · Water: {row.waterMl===undefined?'Not recorded':`${row.waterMl} mL`}</p>{row.notes && <p className="whitespace-pre-wrap break-words">{row.notes}</p>}{enabled && !error && <button type="button" disabled={saving} aria-label={`Edit daily totals for ${row.date}`} onClick={()=>load(row.date)} className="min-h-11 px-3 py-2 rounded-xl border">Edit daily totals</button>}</li>)}</ul>}
    </section>
  </div>;
}
