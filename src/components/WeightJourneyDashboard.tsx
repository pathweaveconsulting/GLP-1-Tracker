import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, ReferenceLine } from 'recharts';
import { format, subDays, subMonths } from 'date-fns';
import { useStore } from '../store/useStore';
import { formatWeight, formatWeightChange, getWeightUnit, lbsToDisplay } from '../lib/units';
import {
  NEEDS_MORE_WEIGHT_DATA, bestMonth, detectPlateaus, doseLevelHistory, firstWeight, latestWeight, projectGoal,
  sortByDate, weeklyChanges, weeklyRate, weightMilestones,
} from '../lib/insights';
import { isoToLocalDateString } from '../lib/dates';
import { EmptyState, Panel, Segmented, Stat } from './ds';

interface Props {
  className?: string;
}

type Timeframe = '2w' | '1m' | '3m' | '6m' | 'all';
const TF_LABEL: Record<Timeframe, string> = { '2w': '2 weeks', '1m': '1 month', '3m': '3 months', '6m': '6 months', all: 'All time' };

const GRID = '#e3e8ef';
const TICK = { fontSize: 12, fill: '#4f5d70' };

export function WeightJourneyDashboard({ className = '' }: Props) {
  const { weights, doses, settings } = useStore();
  const unit = getWeightUnit(settings);
  const toDisplay = (lbs: number) => lbsToDisplay(lbs, unit);
  const [timeframe, setTimeframe] = useState<Timeframe>('all');
  const now = new Date();

  const sorted = useMemo(() => sortByDate(weights), [weights]);
  const first = firstWeight(weights);
  const last = latestWeight(weights);
  const startLbs = settings.startingWeight > 0 ? settings.startingWeight : first?.weightLbs ?? null;
  const targetLbs = settings.targetWeight > 0 ? settings.targetWeight : null;
  const latestLbs = last?.weightLbs ?? null;

  const changeLbs = startLbs != null && latestLbs != null ? latestLbs - startLbs : null;
  const changePct = changeLbs != null && startLbs ? (changeLbs / startLbs) * 100 : null;
  const remainingLbs = latestLbs != null && targetLbs != null ? Math.max(0, latestLbs - targetLbs) : null;
  const goalSpan = startLbs != null && targetLbs != null ? startLbs - targetLbs : 0;
  const progressPercent = goalSpan > 0 && changeLbs != null ? Math.min(100, Math.max(0, Math.round((-changeLbs / goalSpan) * 100))) : null;

  const rate = weeklyRate(weights, now);
  const projection = projectGoal({ weights, startLbs, targetLbs, now });
  const best = bestMonth(weights);
  const plateaus = useMemo(() => detectPlateaus(weights), [weights]);
  const velocity = useMemo(() => weeklyChanges(weights).slice(-10).map((c) => ({ week: format(c.weekStart, 'MMM d'), change: toDisplay(c.deltaLbs) })), [weights, unit]);
  const doseRows = useMemo(() => doseLevelHistory(doses, weights, now), [doses, weights]);
  const milestones = useMemo(() => weightMilestones({ weights, startLbs, targetLbs }), [weights, startLbs, targetLbs]);

  const trendWord = rate ? (rate.lbsPerWeek <= -0.1 ? 'Trending down' : rate.lbsPerWeek >= 0.1 ? 'Trending up' : 'Holding steady') : null;
  const TrendIcon = rate ? (rate.lbsPerWeek <= -0.1 ? TrendingDown : rate.lbsPerWeek >= 0.1 ? TrendingUp : Minus) : Minus;

  const dateRange = first && last ? `${format(new Date(first.date), 'MMM d, yyyy')} – ${format(new Date(last.date), 'MMM d, yyyy')}` : 'No weigh-ins yet';

  const timeline = useMemo(() => {
    if (!last) return [];
    const limit =
      timeframe === '2w' ? subDays(new Date(last.date), 14) :
      timeframe === '1m' ? subMonths(new Date(last.date), 1) :
      timeframe === '3m' ? subMonths(new Date(last.date), 3) :
      timeframe === '6m' ? subMonths(new Date(last.date), 6) : null;
    return sorted
      .filter((w) => !limit || new Date(w.date) >= limit)
      .map((w) => {
        const day = isoToLocalDateString(w.date);
        const dose = doses.find((d) => isoToLocalDateString(d.date) === day);
        return {
          date: format(new Date(w.date), 'MMM d'),
          fullDate: format(new Date(w.date), 'MMM d, yyyy'),
          weight: toDisplay(w.weightLbs),
          dose: dose ? `${dose.amountMg} mg ${dose.medication}` : null,
        };
      });
  }, [sorted, doses, timeframe, last, unit]);

  const forecast = useMemo(() => {
    if (projection.status !== 'projected' || !last || targetLbs == null) return [];
    const recent = sorted.slice(-8).map((w) => ({ t: new Date(w.date).getTime(), actual: toDisplay(w.weightLbs), projected: null as number | null }));
    const end = { t: projection.date.getTime(), actual: null as number | null, projected: toDisplay(targetLbs) };
    const join = { ...recent[recent.length - 1], projected: recent[recent.length - 1].actual };
    return [...recent.slice(0, -1), join, end];
  }, [projection, sorted, last, targetLbs, unit]);

  const chapters = useMemo(() => {
    const m = new Map<string, { name: string; start: number; end: number; n: number }>();
    for (const w of sorted) {
      const d = new Date(w.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const cur = m.get(key);
      if (!cur) m.set(key, { name: format(d, 'MMMM yyyy'), start: w.weightLbs, end: w.weightLbs, n: 1 });
      else { cur.end = w.weightLbs; cur.n++; }
    }
    return Array.from(m.values());
  }, [sorted]);

  if (!last) {
    return (
      <div className={className}>
        <Panel title="Weight journey">
          <EmptyState title="No weigh-ins yet">
            Your story starts with your first weigh-in. <Link to="/weight" className="font-semibold text-brand underline-offset-2 hover:underline">Record a weight</Link> and this page will show your trend, milestones and plateaus, using only what you log.
          </EmptyState>
        </Panel>
      </div>
    );
  }

  return (
    <div className={`space-y-5 ${className}`}>
      <Panel title="At a glance" description={`Weigh-ins from ${dateRange}`}>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
          <Stat
            label="Current weight"
            value={formatWeight(latestLbs, unit, { unit: false })}
            unit={unit}
            note={<>
              {changeLbs == null ? '–' : `${formatWeightChange(changeLbs, unit)}${changePct != null ? ` (${changePct > 0 ? '+' : ''}${changePct.toFixed(1)}%)` : ''}`}
              <br />{startLbs != null ? `Started at ${formatWeight(startLbs, unit)}` : 'Starting weight not set'}
            </>}
          />
          <div className="min-w-0">
            <Stat label="Goal progress" value={progressPercent == null ? '–' : `${progressPercent}%`} note={remainingLbs != null ? `${formatWeight(remainingLbs, unit)} to go` : 'No goal set'} />
            {progressPercent != null && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sunken" aria-hidden="true"><div className="h-full rounded-full bg-brand" style={{ width: `${progressPercent}%` }} /></div>
            )}
          </div>
          <Stat
            label="Recent pace"
            value={rate ? formatWeightChange(rate.lbsPerWeek, unit, { unit: false }) : '–'}
            unit={`${unit}/wk`}
            note={rate ? `Trend of ${rate.points} weigh-ins over ${rate.spanDays} days` : NEEDS_MORE_WEIGHT_DATA}
          />
          <Stat
            label="Biggest month"
            value={best ? format(new Date(best.year, best.month, 1), 'MMM yyyy') : '–'}
            note={best ? `${formatWeight(best.lossLbs, unit)} lower, first to last weigh-in that month` : 'Needs a month with 2+ weigh-ins and a drop'}
          />
          <Stat
            label="Current trend"
            value={<span className="inline-flex items-center gap-1.5"><TrendIcon className="h-5 w-5" aria-hidden="true" />{trendWord ?? '–'}</span>}
            note={rate ? 'Last 8 weeks' : NEEDS_MORE_WEIGHT_DATA}
          />
          <Stat
            label="Goal Date"
            value={projection.status === 'projected' ? format(projection.date, 'MMM d, yyyy') : projection.status === 'reached' ? 'Reached' : '–'}
            note={projection.status === 'projected' ? 'If your recent pace continues' : projection.status === 'reached' ? 'You are at or past your goal weight' : projection.reason}
          />
        </dl>
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Weight over time"
          description="Select or hover a point to see the day, weight and any dose logged that day."
        >
          <Segmented
            label="Timeframe"
            value={timeframe}
            onChange={setTimeframe}
            options={(Object.keys(TF_LABEL) as Timeframe[]).map((tf) => ({ value: tf, label: TF_LABEL[tf] }))}
            className="mb-4"
          />
          <div className="h-[280px] w-full" role="img" aria-label={`Weight over time in ${unit}, ${timeline.length} weigh-ins`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ top: 12, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={TICK} dy={10} minTickGap={24} />
                <YAxis axisLine={false} tickLine={false} tick={TICK} domain={['auto', 'auto']} unit={` ${unit}`} width={64} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as (typeof timeline)[number];
                    return (
                      <div className="space-y-0.5 rounded-[var(--radius-control)] border border-line-strong bg-surface p-3 text-[13px] text-ink">
                        <div className="font-semibold">{d.fullDate}</div>
                        <div>Weight: <span className="font-semibold tabular-nums">{d.weight} {unit}</span></div>
                        {d.dose && <div>Dose that day: <span className="font-semibold">{d.dose}</span></div>}
                      </div>
                    );
                  }}
                />
                <Line type="monotone" dataKey="weight" name={`Weight (${unit})`} stroke="#1d5aa6" strokeWidth={2.5} dot={{ r: 3.5, fill: '#1d5aa6', stroke: '#fff', strokeWidth: 1.5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Your story so far">
          <ul className="space-y-3 text-sm leading-6 text-ink-2">
            <li className="flex items-start gap-2.5"><Dot />
              <span>{changeLbs == null ? 'Add a starting weight to see your total change.' : changeLbs === 0 ? 'Your weight is the same as your starting weight.' : <>Your weight is <strong className="text-ink">{formatWeight(Math.abs(changeLbs), unit)} {changeLbs < 0 ? 'lower' : 'higher'}</strong> than when you started{changePct != null ? ` (${Math.abs(changePct).toFixed(1)}%)` : ''}.</>}</span></li>
            <li className="flex items-start gap-2.5"><Dot />
              <span>{rate ? <>Your recent trend is <strong className="text-ink">{formatWeightChange(rate.lbsPerWeek, unit)} per week</strong>, from {rate.points} weigh-ins.</> : `We can't show a pace yet. ${NEEDS_MORE_WEIGHT_DATA}.`}</span></li>
            <li className="flex items-start gap-2.5"><Dot />
              <span>{plateaus.length > 0 ? <>You have had <strong className="text-ink">{plateaus.length} {plateaus.length === 1 ? 'plateau' : 'plateaus'}</strong> (2+ weeks within about 1 lb).</> : 'No plateaus (2+ weeks within about 1 lb) in your logs so far.'}</span></li>
            <li className="flex items-start gap-2.5"><Dot />
              <span>{doses.length > 0 ? <>You have logged <strong className="text-ink">{doses.length} {doses.length === 1 ? 'dose' : 'doses'}</strong> of {settings.medication}.</> : 'No doses logged yet.'}</span></li>
            <li className="flex items-start gap-2.5"><Dot />
              <span>{projection.status === 'projected' ? <>If your recent pace continues, you'd reach your goal around <strong className="text-ink">{format(projection.date, 'MMM yyyy')}</strong>. Treat that as a rough guide only.</> : projection.status === 'reached' ? 'You are at or past your goal weight.' : `No goal date yet: ${projection.reason.charAt(0).toLowerCase()}${projection.reason.slice(1)}.`}</span></li>
          </ul>
        </Panel>
      </div>

      <Panel title="Month by month" description="Change from the first to the last weigh-in in each month.">
        <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
          {chapters.map((c) => {
            const delta = c.end - c.start;
            return (
              <li key={c.name} className="w-44 shrink-0 rounded-[var(--radius-control)] border border-line bg-canvas p-3.5">
                <div className="text-sm font-semibold text-ink">{c.name}</div>
                <div className="text-[13px] text-muted">{c.n} {c.n === 1 ? 'weigh-in' : 'weigh-ins'}</div>
                <div className="mt-2 text-lg font-semibold tabular-nums text-ink">{c.n > 1 ? formatWeightChange(delta, unit) : '–'}</div>
                <p className="text-[13px] text-muted">{c.n > 1 ? 'first to last weigh-in' : 'needs 2+ weigh-ins'}</p>
              </li>
            );
          })}
        </ul>
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Where your recent pace points" description={forecast.length > 0 ? 'Solid line: your logged weights. Dashed line: your recent trend continued to your goal. Real progress is rarely this smooth.' : undefined}>
          {forecast.length === 0 ? (
            <p className="text-sm text-muted">{projection.status === 'reached' ? 'You are already at your goal weight.' : `${projection.status === 'unknown' ? projection.reason : ''}. We would rather show nothing than guess.`}</p>
          ) : (
            <div className="h-[200px] w-full" role="img" aria-label="Recent weights and a dashed line projecting to your goal weight">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecast} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                  <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(t) => format(new Date(t), "MMM ''yy")} axisLine={false} tickLine={false} tick={TICK} />
                  <YAxis axisLine={false} tickLine={false} tick={TICK} domain={['auto', 'auto']} width={44} />
                  <Tooltip labelFormatter={(t) => format(new Date(t as number), 'MMM d, yyyy')} />
                  <Line type="monotone" dataKey="actual" name="Logged" stroke="#1d5aa6" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
                  <Line type="linear" dataKey="projected" name="If pace continues" stroke="#475569" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
                  {targetLbs != null && <ReferenceLine y={toDisplay(targetLbs)} stroke="#1c6f4c" strokeDasharray="2 4" label={{ value: 'Goal', position: 'insideTopRight', fontSize: 12, fill: '#1c6f4c' }} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title={`Week-over-week change (${unit})`} description={velocity.length > 0 ? 'Change in average weight from one week to the next. Bars below the line are decreases.' : undefined}>
          {velocity.length === 0 ? (
            <p className="text-sm text-muted">Needs weigh-ins in two consecutive weeks.</p>
          ) : (
            <div className="h-[200px] w-full" role="img" aria-label="Change in average weight from one week to the next">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={velocity} margin={{ top: 10, right: 10, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={TICK} />
                  <YAxis axisLine={false} tickLine={false} tick={TICK} width={52} domain={[(min: number) => Math.min(0, min), (max: number) => Math.max(0, max)]} tickFormatter={(v: number) => (Math.round(v * 10) / 10).toString()} />
                  <ReferenceLine y={0} stroke="#7b8a9c" />
                  <Tooltip />
                  <Bar dataKey="change" name={`Change (${unit})`} fill="#1d5aa6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        <Panel title="Your weight at each dose level">
          {doseRows.length < 2 ? (
            <p className="text-sm text-muted">Needs at least two dose levels, each with 2+ weigh-ins over 7+ days.</p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[13px] text-muted"><th scope="col" className="py-1 font-medium">Dose</th><th scope="col" className="py-1 font-medium">Weigh-ins</th><th scope="col" className="py-1 text-right font-medium">Change / week</th></tr></thead>
                <tbody>
                  {doseRows.map((r) => (
                    <tr key={`${r.medication}-${r.amountMg}`} className="border-t border-line">
                      <td className="py-2 font-medium text-ink">{r.amountMg} mg <span className="font-normal text-muted">{r.medication}</span></td>
                      <td className="py-2 text-muted">{r.weighIns} over {r.days} d</td>
                      <td className="py-2 text-right font-semibold tabular-nums text-ink">{formatWeightChange(r.lbsPerWeek, unit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-[13px] text-muted">A description of your own history only. Time on treatment, food, activity and other factors differ between periods, so this does not show which dose works better.</p>
            </>
          )}
        </Panel>

        <Panel title="Plateaus">
          {plateaus.length === 0 ? (
            <p className="text-sm text-muted">None detected. We look for 3+ weigh-ins over 2+ weeks within about 1 lb.</p>
          ) : (
            <ul className="-my-1 divide-y divide-line text-sm">
              {plateaus.map((p) => (
                <li key={p.start} className="py-2">
                  <div className="font-semibold text-ink">{p.days} days</div>
                  <div className="text-[13px] text-muted">{format(new Date(p.start), 'MMM d')} – {format(new Date(p.end), 'MMM d, yyyy')} · {p.weighIns} weigh-ins</div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Milestones">
          {milestones.length === 0 ? (
            <p className="text-sm text-muted">Set a goal weight below your starting weight to track milestones.</p>
          ) : (
            <ul className="-my-1 divide-y divide-line text-sm">
              {milestones.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="flex items-center gap-2">
                    {m.reached ? <CheckCircle2 className="h-4 w-4 text-positive" aria-hidden="true" /> : <Circle className="h-4 w-4 text-muted" aria-hidden="true" />}
                    <span className={m.reached ? 'text-ink' : 'text-muted'}>{m.label}</span>
                  </span>
                  <span className="text-[13px] text-muted">{m.date ? format(new Date(m.date), 'MMM d, yyyy') : 'Upcoming'}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Dot() {
  return <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-2" aria-hidden="true" />;
}
