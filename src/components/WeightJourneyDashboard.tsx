import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Calendar, CheckCircle2, TrendingDown, TrendingUp, Award, Flag, Zap, Compass, Star, Minus } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, AreaChart, Area, ReferenceLine } from 'recharts';
import { format, subDays, subMonths } from 'date-fns';
import { useStore } from '../store/useStore';
import { formatWeight, formatWeightChange, getWeightUnit, lbsToDisplay } from '../lib/units';
import {
  NEEDS_MORE_WEIGHT_DATA, bestMonth, detectPlateaus, doseLevelHistory, firstWeight, latestWeight, projectGoal,
  sortByDate, weeklyChanges, weeklyRate, weightMilestones,
} from '../lib/insights';
import { isoToLocalDateString } from '../lib/dates';

interface Props {
  className?: string;
}

type Timeframe = '2w' | '1m' | '3m' | '6m' | 'all';
const TF_LABEL: Record<Timeframe, string> = { '2w': '2 Weeks', '1m': '1 Month', '3m': '3 Months', '6m': '6 Months', all: 'All Time' };

const card = 'bg-white p-6 rounded-[24px] border border-[#E5E7EB] shadow-xs';
const kpi = 'bg-white p-5 rounded-[20px] border border-[#E5E7EB] shadow-xs flex flex-col justify-between';

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
      <div className={`space-y-6 ${className}`}>
        <div className={card}>
          <h2 className="text-2xl font-semibold text-[#111827] tracking-tight">Weight Journey</h2>
          <p className="text-sm text-[#667085] mt-2">
            Your story starts with your first weigh-in. <Link to="/weight" className="text-[#6D4AFF] font-semibold hover:underline">Record a weight</Link> and this page will show your trend, milestones and plateaus, using only what you log.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[24px] border border-[#E5E7EB] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-semibold text-[#111827] tracking-tight">Weight Journey</h2>
            <Sparkles className="w-5 h-5 text-[#6D4AFF]" aria-hidden="true" />
          </div>
          <p className="text-sm font-normal text-[#667085] mt-1">Your own weigh-ins, in your own words.</p>
        </div>
        <div className="flex items-center gap-2 bg-[#F8F9FC] px-3.5 py-2.5 rounded-[14px] border border-[#E5E7EB] text-xs font-medium text-[#111827]">
          <Calendar className="w-4 h-4 text-[#667085]" aria-hidden="true" />
          <span>{dateRange}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className={kpi}>
          <div className="flex items-center gap-2 text-[#667085] text-xs font-semibold"><Compass className="w-4 h-4 text-[#6D4AFF]" aria-hidden="true" /><span>Current Weight</span></div>
          <div className="my-3">
            <div className="text-3xl font-semibold text-[#111827] tracking-tight">{formatWeight(latestLbs, unit, { unit: false })} <span className="text-sm font-normal text-[#667085]">{unit}</span></div>
            <div className="text-xs font-semibold text-slate-600 mt-0.5">
              {changeLbs == null ? '–' : `${formatWeightChange(changeLbs, unit)}${changePct != null ? ` (${changePct > 0 ? '+' : ''}${changePct.toFixed(1)}%)` : ''}`}
            </div>
          </div>
          <p className="text-xs font-normal text-[#98A2B3]">{startLbs != null ? `Started at ${formatWeight(startLbs, unit)}` : 'Starting weight not set'}</p>
        </div>

        <div className={kpi}>
          <div className="flex items-center gap-2 text-[#667085] text-xs font-semibold"><Award className="w-4 h-4 text-[#22C55E]" aria-hidden="true" /><span>Goal Progress</span></div>
          <div className="my-3">
            <div className="text-3xl font-semibold text-[#111827] tracking-tight">{progressPercent == null ? '–' : `${progressPercent}%`}</div>
            {progressPercent != null && (
              <div className="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden mt-2"><div className="bg-[#22C55E] h-full rounded-full" style={{ width: `${progressPercent}%` }} /></div>
            )}
          </div>
          <div className="text-xs font-normal text-[#98A2B3] flex justify-between">
            <span>{remainingLbs != null ? `${formatWeight(remainingLbs, unit)} to go` : 'No goal set'}</span>
          </div>
        </div>

        <div className={kpi}>
          <div className="flex items-center gap-2 text-[#667085] text-xs font-semibold"><Zap className="w-4 h-4 text-[#6D4AFF]" aria-hidden="true" /><span>Recent Pace</span></div>
          <div className="my-3">
            <div className="text-3xl font-semibold text-[#111827] tracking-tight">{rate ? formatWeightChange(rate.lbsPerWeek, unit, { unit: false }) : '–'} <span className="text-sm font-normal text-[#667085]">{unit}/wk</span></div>
          </div>
          <p className="text-xs font-normal text-[#98A2B3]">{rate ? `Trend of ${rate.points} weigh-ins over ${rate.spanDays} days` : NEEDS_MORE_WEIGHT_DATA}</p>
        </div>

        <div className={kpi}>
          <div className="flex items-center gap-2 text-[#667085] text-xs font-semibold"><Star className="w-4 h-4 text-[#F59E0B]" aria-hidden="true" /><span>Biggest Month</span></div>
          <div className="my-3">
            <div className="text-xl font-semibold text-[#111827] tracking-tight">{best ? format(new Date(best.year, best.month, 1), 'MMM yyyy') : '–'}</div>
            {best && <div className="text-xs font-semibold text-amber-700 mt-0.5">{formatWeight(best.lossLbs, unit)} lower</div>}
          </div>
          <p className="text-xs font-normal text-[#98A2B3]">{best ? 'First to last weigh-in that month' : 'Needs a month with 2+ weigh-ins and a drop'}</p>
        </div>

        <div className={kpi}>
          <div className="flex items-center gap-2 text-[#667085] text-xs font-semibold"><TrendIcon className="w-4 h-4 text-[#22C55E]" aria-hidden="true" /><span>Current Trend</span></div>
          <div className="my-3"><div className="text-xl font-semibold text-[#111827] tracking-tight">{trendWord ?? '–'}</div></div>
          <p className="text-xs font-normal text-[#98A2B3]">{rate ? 'Last 8 weeks' : NEEDS_MORE_WEIGHT_DATA}</p>
        </div>

        <div className={kpi}>
          <div className="flex items-center gap-2 text-[#667085] text-xs font-semibold"><Flag className="w-4 h-4 text-rose-500" aria-hidden="true" /><span>Goal Date</span></div>
          <div className="my-3">
            <div className="text-lg font-semibold text-[#111827] tracking-tight">
              {projection.status === 'projected' ? format(projection.date, 'MMM d, yyyy') : projection.status === 'reached' ? 'Reached' : '–'}
            </div>
          </div>
          <p className="text-xs font-normal text-[#98A2B3]">
            {projection.status === 'projected' ? 'If your recent pace continues' : projection.status === 'reached' ? 'You are at or past your goal weight' : projection.reason}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section aria-labelledby="timeline-heading" className={`lg:col-span-2 ${card}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h3 id="timeline-heading" className="text-base font-semibold text-[#111827] tracking-tight">Weight Journey Timeline</h3>
              <p className="text-xs font-normal text-[#667085] mt-0.5">Hover a point to see the day, weight and any dose logged that day</p>
            </div>
            <div className="flex bg-[#F8F9FC] p-1 rounded-[12px] border border-[#E5E7EB] text-xs font-medium text-[#667085]" role="group" aria-label="Timeframe">
              {(Object.keys(TF_LABEL) as Timeframe[]).map((tf) => (
                <button key={tf} type="button" aria-pressed={timeframe === tf} onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-[8px] transition-all cursor-pointer ${timeframe === tf ? 'bg-white text-[#111827] shadow-xs font-semibold' : 'hover:text-[#111827]'}`}>
                  {TF_LABEL[tf]}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[280px] w-full" role="img" aria-label={`Weight over time in ${unit}, ${timeline.length} weigh-ins`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 20, right: 30, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="journeyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} minTickGap={24} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} domain={['auto', 'auto']} unit={` ${unit}`} width={64} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as (typeof timeline)[number];
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-[16px] shadow-xl text-xs space-y-1 border border-slate-700">
                        <div className="font-semibold text-purple-300">{d.fullDate}</div>
                        <div>Weight: <span className="font-semibold">{d.weight} {unit}</span></div>
                        {d.dose && <div>Dose that day: <span className="font-semibold text-emerald-400">{d.dose}</span></div>}
                      </div>
                    );
                  }}
                />
                <Area type="monotone" dataKey="weight" stroke="#6d4aff" strokeWidth={3} fillOpacity={1} fill="url(#journeyGradient)" dot={{ r: 4, fill: '#6d4aff', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section aria-labelledby="story-heading" className="bg-gradient-to-br from-purple-50 via-white to-purple-50/60 p-6 rounded-[24px] border border-purple-100 shadow-xs">
          <h3 id="story-heading" className="text-base font-semibold text-[#111827] mb-4">Your story so far</h3>
          <ul className="space-y-3 text-xs font-normal text-[#667085]">
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" aria-hidden="true" />
              <span>{changeLbs == null ? 'Add a starting weight to see your total change.' : changeLbs === 0 ? 'Your weight is the same as your starting weight.' : <>Your weight is <strong>{formatWeight(Math.abs(changeLbs), unit)} {changeLbs < 0 ? 'lower' : 'higher'}</strong> than when you started{changePct != null ? ` (${Math.abs(changePct).toFixed(1)}%)` : ''}.</>}</span></li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" aria-hidden="true" />
              <span>{rate ? <>Your recent trend is <strong>{formatWeightChange(rate.lbsPerWeek, unit)} per week</strong>, from {rate.points} weigh-ins.</> : `We can't show a pace yet. ${NEEDS_MORE_WEIGHT_DATA}.`}</span></li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" aria-hidden="true" />
              <span>{plateaus.length > 0 ? <>You have had <strong>{plateaus.length} {plateaus.length === 1 ? 'plateau' : 'plateaus'}</strong> (2+ weeks within about 1 lb).</> : 'No plateaus (2+ weeks within about 1 lb) in your logs so far.'}</span></li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" aria-hidden="true" />
              <span>{doses.length > 0 ? <>You have logged <strong>{doses.length} {doses.length === 1 ? 'dose' : 'doses'}</strong> of {settings.medication}.</> : 'No doses logged yet.'}</span></li>
            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" aria-hidden="true" />
              <span>{projection.status === 'projected' ? <>If your recent pace continues, you'd reach your goal around <strong>{format(projection.date, 'MMM yyyy')}</strong>. Treat that as a rough guide only.</> : projection.status === 'reached' ? 'You are at or past your goal weight.' : `No goal date yet: ${projection.reason.charAt(0).toLowerCase()}${projection.reason.slice(1)}.`}</span></li>
          </ul>
        </section>
      </div>

      <section aria-labelledby="chapters-heading" className={`${card} space-y-4`}>
        <h3 id="chapters-heading" className="text-base font-semibold text-[#111827] tracking-tight">Month by month</h3>
        <ul className="flex gap-3 overflow-x-auto pb-2">
          {chapters.map((c) => {
            const delta = c.end - c.start;
            return (
              <li key={c.name} className="w-48 shrink-0 p-4 rounded-[16px] border border-[#E5E7EB] bg-[#F8F9FC]">
                <div className="text-sm font-semibold text-[#111827]">{c.name}</div>
                <div className="text-[11px] text-[#667085] mt-0.5">{c.n} {c.n === 1 ? 'weigh-in' : 'weigh-ins'}</div>
                <div className="text-base font-semibold text-[#111827] mt-3">{c.n > 1 ? formatWeightChange(delta, unit) : '–'}</div>
                <p className="text-[11px] text-[#667085]">{c.n > 1 ? 'first to last weigh-in' : 'needs 2+ weigh-ins'}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section aria-labelledby="forecast-heading" className={card}>
          <h3 id="forecast-heading" className="text-sm font-semibold text-[#344054] mb-1">Where your recent pace points</h3>
          {forecast.length === 0 ? (
            <p className="text-xs text-[#667085] mt-3">{projection.status === 'reached' ? 'You are already at your goal weight.' : `${projection.status === 'unknown' ? projection.reason : ''}. We would rather show nothing than guess.`}</p>
          ) : (
            <>
              <p className="text-[11px] text-[#98A2B3] mb-2">Dashed line: your recent trend continued to your goal. Real progress is rarely this smooth.</p>
              <div className="h-[200px] w-full" role="img" aria-label="Recent weights and a dashed line projecting to your goal weight">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={forecast} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(t) => format(new Date(t), "MMM ''yy")} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} domain={['auto', 'auto']} width={44} />
                    <Tooltip labelFormatter={(t) => format(new Date(t as number), 'MMM d, yyyy')} />
                    <Line type="monotone" dataKey="actual" name="Logged" stroke="#6d4aff" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
                    <Line type="linear" dataKey="projected" name="If pace continues" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
                    {targetLbs != null && <ReferenceLine y={toDisplay(targetLbs)} stroke="#22c55e" strokeDasharray="2 4" />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </section>

        <section aria-labelledby="velocity-heading" className={card}>
          <h3 id="velocity-heading" className="text-sm font-semibold text-[#344054]">Week-over-week change <span className="text-[11px] font-normal text-[#98A2B3]">({unit})</span></h3>
          {velocity.length === 0 ? (
            <p className="text-xs text-[#667085] mt-3">Needs weigh-ins in two consecutive weeks.</p>
          ) : (
            <div className="h-[200px] w-full mt-2" role="img" aria-label="Change in average weight from one week to the next">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={velocity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                  <Tooltip />
                  <Bar dataKey="change" name={`Change (${unit})`} fill="#22c55e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <section aria-labelledby="dose-heading" className={card}>
          <h3 id="dose-heading" className="text-sm font-semibold text-[#344054]">Your weight at each dose level</h3>
          {doseRows.length < 2 ? (
            <p className="text-xs text-[#667085] mt-3">Needs at least two dose levels, each with 2+ weigh-ins over 7+ days.</p>
          ) : (
            <>
              <table className="w-full text-xs mt-3">
                <thead><tr className="text-left text-[#98A2B3]"><th className="py-1 font-medium">Dose</th><th className="py-1 font-medium">Weigh-ins</th><th className="py-1 font-medium text-right">Change / week</th></tr></thead>
                <tbody>
                  {doseRows.map((r) => (
                    <tr key={`${r.medication}-${r.amountMg}`} className="border-t border-[#F1F5F9]">
                      <td className="py-2 font-medium text-[#111827]">{r.amountMg} mg <span className="text-[#98A2B3] font-normal">{r.medication}</span></td>
                      <td className="py-2 text-[#667085]">{r.weighIns} over {r.days} d</td>
                      <td className="py-2 text-right font-semibold text-[#111827]">{formatWeightChange(r.lbsPerWeek, unit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[11px] text-[#98A2B3] mt-3">A description of your own history only. Time on treatment, food, activity and other factors differ between periods, so this does not show which dose works better.</p>
            </>
          )}
        </section>

        <section aria-labelledby="plateau-heading" className={card}>
          <h3 id="plateau-heading" className="text-sm font-semibold text-[#344054]">Plateaus</h3>
          {plateaus.length === 0 ? (
            <p className="text-xs text-[#667085] mt-3">None detected. We look for 3+ weigh-ins over 2+ weeks within about 1 lb.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-xs">
              {plateaus.map((p) => (
                <li key={p.start} className="p-3 rounded-[14px] bg-[#F8F9FC] border border-[#E5E7EB]">
                  <div className="font-semibold text-[#111827]">{p.days} days</div>
                  <div className="text-[11px] text-[#667085]">{format(new Date(p.start), 'MMM d')} – {format(new Date(p.end), 'MMM d, yyyy')} · {p.weighIns} weigh-ins</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="milestone-heading" className={card}>
          <h3 id="milestone-heading" className="text-sm font-semibold text-[#344054] mb-3">Milestones</h3>
          {milestones.length === 0 ? (
            <p className="text-xs text-[#667085]">Set a goal weight below your starting weight to track milestones.</p>
          ) : (
            <ul className="space-y-2 text-xs font-medium">
              {milestones.map((m) => (
                <li key={m.id} className={`flex items-center justify-between p-2.5 rounded-[12px] ${m.reached ? 'bg-[#F8F9FC]' : 'bg-[#F8F9FC]/60 text-[#98A2B3]'}`}>
                  <span className="flex items-center gap-2 text-[#111827]">
                    {m.reached ? <CheckCircle2 className="w-4 h-4 text-[#22C55E]" aria-hidden="true" /> : <span className="w-4 h-4 rounded-full border border-[#D0D5DD] inline-block" aria-hidden="true" />}
                    <span className={m.reached ? '' : 'text-[#667085]'}>{m.label}</span>
                  </span>
                  <span className="text-[11px] text-[#667085] font-normal">{m.date ? format(new Date(m.date), 'MMM d, yyyy') : 'Upcoming'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
