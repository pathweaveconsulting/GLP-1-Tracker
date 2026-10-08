import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react';
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
import { buttonClass, EmptyState, noteClass, PageHeader, Panel, Segmented, Stat } from '../components/ds';


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
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="A plain summary of what you logged in a week or a month."
        actions={<button type="button" onClick={() => window.print()} className={buttonClass('secondary', 'md', 'print:hidden')}>
          <Printer className="h-4 w-4" aria-hidden="true" /><span>Print / save PDF</span>
        </button>}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Segmented label="Report length" value={kind} onChange={changeKind} options={[{ value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }]} />
        {doctorReportEnabled() && (
          <label className="flex min-h-11 items-center gap-2.5 text-sm text-ink"><input type="checkbox" checked={includeRecords} onChange={event => setIncludeRecords(event.target.checked)} className="h-5 w-5 shrink-0 accent-brand" />Include individual records and notes for my clinician</label>
        )}
      </div>
      {doctorReportEnabled() && <p className={`${noteClass('neutral')} print:hidden`}>Review the selected period and notes before sharing. Print / save PDF opens your browser’s print dialog; choose Save as PDF if available. Copies are unencrypted. This does not save a restorable backup.</p>}

      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-line bg-surface p-2">
        <button type="button" onClick={() => setRange(shiftPeriod(range, -1))} aria-label={`Previous ${kind === 'weekly' ? 'week' : 'month'}`}
          className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] text-ink hover:bg-sunken print:hidden">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <h2 className="text-center text-base font-semibold text-ink sm:text-lg" aria-live="polite">{periodLabel(range)}</h2>
        <button type="button" onClick={() => setRange(nextRange)} disabled={!canGoNext} aria-label={`Next ${kind === 'weekly' ? 'week' : 'month'}`}
          className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] text-ink hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-40 print:hidden">
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {report.isEmpty && dailyRows.length === 0 ? (
        <EmptyState title={`Nothing was logged in this ${kind === 'weekly' ? 'week' : 'month'}`}>
          Use the arrows to look at another period, or <Link to="/" className="font-semibold text-brand underline-offset-2 hover:underline">log something today</Link>.
        </EmptyState>
      ) : (
        <>
          <Panel title="Weight" titleAs="h3" className="print:break-inside-avoid">
            {report.weights.entries.length === 0 ? (
              <p className="text-sm text-muted">No weigh-ins in this period.</p>
            ) : (
              <>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
                  <Stat label="First weigh-in" value={formatWeight(report.weights.first!.weightLbs, unit)} />
                  <Stat label="Last weigh-in" value={formatWeight(report.weights.last!.weightLbs, unit)} />
                  <Stat label="Change in period" value={report.weights.changeLbs == null ? '– (needs 2 weigh-ins)' : formatWeightChange(report.weights.changeLbs, unit)} />
                  <Stat label={`Average (${report.weights.entries.length} ${report.weights.entries.length === 1 ? 'entry' : 'entries'})`} value={formatWeight(report.weights.averageLbs, unit)} />
                </dl>
                {chart.length >= 2 && (
                  <div className="mt-4 h-[180px] w-full" role="img" aria-label={`Weight in ${unit} across this period`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chart} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3e8ef" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4f5d70' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4f5d70' }} domain={['auto', 'auto']} width={44} />
                        <Tooltip />
                        <Line type="monotone" dataKey="weight" name={`Weight (${unit})`} stroke="#1d5aa6" strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </Panel>

          <Panel title="Doses" titleAs="h3" className="print:break-inside-avoid">
            {report.doses.entries.length === 0 ? (
              <p className="text-sm text-muted">No doses logged in this period.</p>
            ) : (
              <>
                <ul className="-my-1 divide-y divide-line text-sm">
                  {report.doses.entries.map((d) => (
                    <li key={d.id} className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 py-2">
                      <span className="font-semibold text-ink">{d.amountMg} mg {d.medication}</span>
                      <span className="text-ink-2">{format(new Date(d.date), 'EEE, MMM d · h:mm a')} · {d.site}</span>
                    </li>
                  ))}
                </ul>
                {report.doses.changedFrom && (
                  <p className="mt-3 text-sm text-ink-2">
                    Dose change: your previous logged dose was {report.doses.changedFrom.amountMg} mg {report.doses.changedFrom.medication}.
                  </p>
                )}
              </>
            )}
          </Panel>

          <Panel title="Symptoms" titleAs="h3" className="print:break-inside-avoid">
            {report.symptoms.daysLogged === 0 ? (
              <p className="text-sm text-muted">No symptom logs in this period.</p>
            ) : report.symptoms.items.length === 0 ? (
              <p className="text-sm text-muted">You logged {report.symptoms.daysLogged} {report.symptoms.daysLogged === 1 ? 'day' : 'days'} with no positive symptom ratings recorded. Unanswered symptoms remain unrecorded.</p>
            ) : (
              <>
                <p className="mb-1 text-[13px] text-muted">{report.symptoms.daysLogged} {report.symptoms.daysLogged === 1 ? 'day' : 'days'} logged</p>
                <ul className="divide-y divide-line text-sm">
                  {report.symptoms.items.map((i) => (
                    <li key={i.key} className="flex flex-wrap justify-between gap-x-3 py-2">
                      <span className="font-semibold text-ink">{i.label}</span>
                      <span className="text-ink-2">{severityLabel(i.peak)} at worst · {i.daysPresent} {i.daysPresent === 1 ? 'day' : 'days'}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>
        </>
      )}
      {doctorReportEnabled() && includeRecords && <DoctorRecords doses={doses} weights={weights} effects={effects} settings={settings} range={range} />}
      {daily.error && <p role="alert" className={noteClass('danger', 'text-sm')}>Daily records could not be read; this report is incomplete. Original encrypted bytes are kept. Export a backup from Settings before recovery.</p>}
      {dailyRows.length > 0 && <section aria-labelledby="report-daily" className="rounded-[var(--radius-panel)] border border-line bg-surface p-4 sm:p-5"><h2 id="report-daily" className="text-[15px] font-semibold text-ink">Recorded protein & water totals</h2><p className="mb-2 mt-0.5 text-[13px] text-muted">Self-reported daily totals; missing values and days are unrecorded. These are not recommended targets.</p><ul className="divide-y divide-line text-sm text-ink-2">{dailyRows.map(row => <li key={row.date} className="py-2"><p>{row.date} · Protein: {row.proteinGrams === undefined ? 'Not recorded' : `${row.proteinGrams} g`} · Water: {row.waterMl === undefined ? 'Not recorded' : `${row.waterMl} mL`}</p>{includeRecords && row.notes && <p className="whitespace-pre-wrap break-words">Notes: {row.notes}</p>}</li>)}</ul></section>}
      <p className="text-center text-[13px] text-muted">Generated from your own logs on this device. Not medical advice. Printed/PDF copies are unencrypted.</p>
    </div>
  );
}
