import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Printer, Scale, Syringe, HeartPulse } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { useStore } from '../store/useStore';
import { buildPeriodReport, periodFor, PeriodRange, ReportKind, shiftPeriod } from '../lib/reports';
import { formatWeight, formatWeightChange, getWeightUnit, lbsToDisplay } from '../lib/units';
import { severityLabel } from '../lib/symptoms';
import { DoctorRecords } from '../components/DoctorRecords';
import { doctorReportEnabled } from '../lib/features';
import { useDailyLogs } from '../store/dailyLogs';
import { isoToLocalDateString } from '../lib/dates';

const card = 'bg-white p-6 rounded-[24px] border border-[#E5E7EB] shadow-xs print:shadow-none';

function periodLabel(range: PeriodRange): string {
  return range.kind === 'monthly'
    ? format(range.start, 'MMMM yyyy')
    : `${format(range.start, 'EEE, MMM d')} – ${format(range.end, 'EEE, MMM d, yyyy')}`;
}

export function Reports() {
  const { doses, weights, effects, settings } = useStore();
  const unit = getWeightUnit(settings);
  const daily = useDailyLogs();
  const [kind, setKind] = useState<ReportKind>('weekly');
  const [includeRecords, setIncludeRecords] = useState(false);
  const [range, setRange] = useState<PeriodRange>(() => periodFor('weekly', new Date()));

  const now = new Date();
  const nextRange = shiftPeriod(range, 1);
  const canGoNext = nextRange.start.getTime() <= now.getTime();

  const changeKind = (k: ReportKind) => {
    setKind(k);
    setRange(periodFor(k, range.start));
  };

  const report = useMemo(() => buildPeriodReport({ doses, weights, effects, range }), [doses, weights, effects, range]);
  const chart = report.weights.entries.map((w) => ({ date: format(new Date(w.date), 'MMM d'), weight: lbsToDisplay(w.weightLbs, unit) }));
  const dailyRows = daily.rows.filter(row => row.date >= isoToLocalDateString(range.start.toISOString()) && row.date <= isoToLocalDateString(range.end.toISOString()));

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">Reports</h1>
          <p className="text-sm text-muted mt-0.5">A plain summary of what you logged in a week or a month.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap print:hidden">
          <div className="flex bg-[#F8F9FC] p-1 rounded-[14px] border border-[#E5E7EB]" role="group" aria-label="Report length">
            {(['weekly', 'monthly'] as ReportKind[]).map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => changeKind(k)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-[10px] capitalize transition-all ${kind === k ? 'bg-white text-[#111827] shadow-xs' : 'text-muted hover:text-[#111827]'}`}>
                {k}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-[14px] border border-[#E5E7EB] bg-white text-xs font-semibold text-[#111827] hover:bg-[#F8F9FC]">
            <Printer className="w-4 h-4 text-muted" aria-hidden="true" /> Print / save PDF
          </button>
        </div>
      </header>

      {doctorReportEnabled() && <div className="space-y-2 print:hidden">
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={includeRecords} onChange={event => setIncludeRecords(event.target.checked)} className="mt-1 h-5 w-5" />Include individual records and notes for my clinician</label>
        <p className="text-xs text-muted">Review the selected period and notes before sharing. Print / save PDF opens your browser’s print dialog; choose Save as PDF if available. Copies are unencrypted. This does not save a restorable backup.</p>
      </div>}

      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setRange(shiftPeriod(range, -1))} aria-label={`Previous ${kind === 'weekly' ? 'week' : 'month'}`}
          className="w-9 h-9 rounded-full border border-[#E5E7EB] bg-white flex items-center justify-center hover:bg-[#F8F9FC] print:hidden">
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        </button>
        <h2 className="text-lg font-semibold text-[#111827] text-center" aria-live="polite">{periodLabel(range)}</h2>
        <button type="button" onClick={() => setRange(nextRange)} disabled={!canGoNext} aria-label={`Next ${kind === 'weekly' ? 'week' : 'month'}`}
          className="w-9 h-9 rounded-full border border-[#E5E7EB] bg-white flex items-center justify-center hover:bg-[#F8F9FC] disabled:opacity-40 disabled:cursor-not-allowed print:hidden">
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {report.isEmpty && dailyRows.length === 0 ? (
        <div className={card}>
          <p className="text-sm text-muted">
            Nothing was logged in this {kind === 'weekly' ? 'week' : 'month'}. Use the arrows to look at another period, or <Link to="/" className="text-[#6D4AFF] font-semibold hover:underline">log something today</Link>.
          </p>
        </div>
      ) : (
        <>
          <section aria-labelledby="rep-weight" className={card}>
            <div className="flex items-center gap-2 mb-4"><Scale className="w-4 h-4 text-positive" aria-hidden="true" /><h3 id="rep-weight" className="text-sm font-semibold text-[#111827]">Weight</h3></div>
            {report.weights.entries.length === 0 ? (
              <p className="text-xs text-muted">No weigh-ins in this period.</p>
            ) : (
              <>
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><dt className="text-xs text-muted">First weigh-in</dt><dd className="font-semibold">{formatWeight(report.weights.first!.weightLbs, unit)}</dd></div>
                  <div><dt className="text-xs text-muted">Last weigh-in</dt><dd className="font-semibold">{formatWeight(report.weights.last!.weightLbs, unit)}</dd></div>
                  <div><dt className="text-xs text-muted">Change in period</dt><dd className="font-semibold">{report.weights.changeLbs == null ? '– (needs 2 weigh-ins)' : formatWeightChange(report.weights.changeLbs, unit)}</dd></div>
                  <div><dt className="text-xs text-muted">Average ({report.weights.entries.length} {report.weights.entries.length === 1 ? 'entry' : 'entries'})</dt><dd className="font-semibold">{formatWeight(report.weights.averageLbs, unit)}</dd></div>
                </dl>
                {chart.length >= 2 && (
                  <div className="h-[180px] w-full mt-4" role="img" aria-label={`Weight in ${unit} across this period`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chart} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569' }} domain={['auto', 'auto']} width={44} />
                        <Tooltip />
                        <Line type="monotone" dataKey="weight" name={`Weight (${unit})`} stroke="#15803d" strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </section>

          <section aria-labelledby="rep-doses" className={card}>
            <div className="flex items-center gap-2 mb-4"><Syringe className="w-4 h-4 text-[#6D4AFF]" aria-hidden="true" /><h3 id="rep-doses" className="text-sm font-semibold text-[#111827]">Doses</h3></div>
            {report.doses.entries.length === 0 ? (
              <p className="text-xs text-muted">No doses logged in this period.</p>
            ) : (
              <>
                <ul className="space-y-2 text-sm">
                  {report.doses.entries.map((d) => (
                    <li key={d.id} className="flex justify-between p-3 rounded-[14px] bg-[#F8F9FC] border border-[#E5E7EB]">
                      <span className="font-medium text-[#111827]">{d.amountMg} mg {d.medication}</span>
                      <span className="text-xs text-muted">{format(new Date(d.date), 'EEE, MMM d · h:mm a')} · {d.site}</span>
                    </li>
                  ))}
                </ul>
                {report.doses.changedFrom && (
                  <p className="text-xs text-[#344054] mt-3">
                    Dose change: your previous logged dose was {report.doses.changedFrom.amountMg} mg {report.doses.changedFrom.medication}.
                  </p>
                )}
              </>
            )}
          </section>

          <section aria-labelledby="rep-symptoms" className={card}>
            <div className="flex items-center gap-2 mb-4"><HeartPulse className="w-4 h-4 text-danger" aria-hidden="true" /><h3 id="rep-symptoms" className="text-sm font-semibold text-[#111827]">Symptoms</h3></div>
            {report.symptoms.daysLogged === 0 ? (
              <p className="text-xs text-muted">No symptom logs in this period.</p>
            ) : report.symptoms.items.length === 0 ? (
              <p className="text-xs text-muted">You logged {report.symptoms.daysLogged} {report.symptoms.daysLogged === 1 ? 'day' : 'days'} with no positive symptom ratings recorded. Unanswered symptoms remain unrecorded.</p>
            ) : (
              <>
                <p className="text-[11px] text-subtle mb-2">{report.symptoms.daysLogged} {report.symptoms.daysLogged === 1 ? 'day' : 'days'} logged</p>
                <ul className="space-y-2 text-sm">
                  {report.symptoms.items.map((i) => (
                    <li key={i.key} className="flex justify-between p-3 rounded-[14px] bg-[#F8F9FC] border border-[#E5E7EB]">
                      <span className="font-medium text-[#111827]">{i.label}</span>
                      <span className="text-xs text-muted">{severityLabel(i.peak)} at worst · {i.daysPresent} {i.daysPresent === 1 ? 'day' : 'days'}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}
      {doctorReportEnabled() && includeRecords && <DoctorRecords doses={doses} weights={weights} effects={effects} settings={settings} range={range} />}
      {daily.error && <p role="alert" className="text-danger">Daily records could not be read; this report is incomplete. Original encrypted bytes are kept. Export a backup from Settings before recovery.</p>}
      {dailyRows.length > 0 && <section aria-labelledby="report-daily" className={card}><h2 id="report-daily" className="text-lg font-semibold mb-3">Recorded protein & water totals</h2><p className="text-xs text-muted mb-3">Self-reported daily totals; missing values and days are unrecorded. These are not recommended targets.</p><ul className="space-y-3">{dailyRows.map(row => <li key={row.date}><p>{row.date} · Protein: {row.proteinGrams === undefined ? 'Not recorded' : `${row.proteinGrams} g`} · Water: {row.waterMl === undefined ? 'Not recorded' : `${row.waterMl} mL`}</p>{includeRecords && row.notes && <p className="whitespace-pre-wrap break-words">Notes: {row.notes}</p>}</li>)}</ul></section>}
      <p className="text-[11px] text-subtle text-center">Generated from your own logs on this device. Not medical advice. Printed/PDF copies are unencrypted.</p>
    </div>
  );
}
