import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from 'recharts';
import { useStore } from '../store/useStore';
import { severityLabel, sortEffects, dailySymptomEntries } from '../lib/symptoms';
import { sortByDate } from '../lib/insights';
import {
  appetiteTrend, doseSymptomComparison, injectionDetail, recoveryPattern, symptomHeatmap, symptomOverview,
} from '../lib/sideEffectsAnalytics';
import type { Severity } from '../types';
import { EmptyState, inputClass, noteClass, Panel, Segmented, Stat } from './ds';

interface Props {
  className?: string;
}

const GRID = '#e3e8ef';
const TICK = { fontSize: 12, fill: '#4f5d70' };
const LEGEND = { fontSize: 13, color: '#2e3e54' };
const SEV_TICKS = [0, 1, 2, 3];
const sevTick = (v: number) => ['None', 'Mild', 'Moderate', 'Severe'][v] ?? '';
// Doses are also named in the legend and tooltip; neighbouring colours differ in lightness as well as hue.
const DOSE_COLORS = ['#164a8a', '#6b8fc0', '#8a5300', '#1c6f4c', '#5a6779', '#b42318'];

const CELL: Record<Severity | 'empty', string> = {
  severe: 'bg-rose-700 text-white',
  moderate: 'bg-amber-700 text-white',
  mild: 'bg-amber-200 text-amber-900',
  none: 'bg-[#86efac] text-emerald-950',
  empty: 'bg-sunken text-subtle',
};

export function SideEffectsAnalyticsDashboard({ className = '' }: Props) {
  const { doses, effects } = useStore();
  const [heatmapMode, setHeatmapMode] = useState<'months' | 'weeks'>('months');
  const sortedDoses = useMemo(() => sortByDate(doses, 'desc'), [doses]);
  const [selectedDoseId, setSelectedDoseId] = useState<string>('');

  const logs = useMemo(() => sortEffects(effects), [effects]);
  const days = useMemo(() => dailySymptomEntries(effects), [effects]);
  const overview = useMemo(() => symptomOverview(effects), [effects]);
  const recovery = useMemo(() => recoveryPattern(effects, doses), [effects, doses]);
  const heatmap = useMemo(() => symptomHeatmap(effects, heatmapMode), [effects, heatmapMode]);
  const appetite = useMemo(() => appetiteTrend(effects), [effects]);
  const byDose = useMemo(() => doseSymptomComparison(effects, doses), [effects, doses]);

  const detailDose = sortedDoses.find((d) => d.id === selectedDoseId) ?? sortedDoses[0];
  const detail = detailDose ? injectionDetail(effects, doses, detailDose.id) : null;

  const daysWithModerate = days.filter((e) =>
    [e.nausea, e.fatigue, e.diarrhea, e.constipation, e.bloating, e.reflux, ...Object.values(e.customEffects ?? {})].some((s) => s === 'moderate' || s === 'severe'),
  ).length;
  const top = overview[0];

  if (logs.length === 0) {
    return (
      <div className={className}>
        <Panel title="Side effects overview">
          <EmptyState title="No symptoms logged yet">
            <Link to="/effects" className="font-semibold text-brand underline-offset-2 hover:underline">Log how you feel</Link> and this page will show how often each symptom shows up, when in the week, and how it changes over time. It only ever uses your own entries.
          </EmptyState>
        </Panel>
      </div>
    );
  }

  return (
    <div className={`space-y-5 ${className}`}>
      <Panel
        title="Side effects overview"
        description={`Based on ${logs.length} symptom ${logs.length === 1 ? 'log' : 'logs'} from ${format(new Date(logs[0].date), 'MMM d, yyyy')} to ${format(new Date(logs[logs.length - 1].date), 'MMM d, yyyy')}. Compared with your own history, not with anyone else. Day counts and trends use the highest recorded severity per local day.`}
      >
        {days.length < 6 && <p className={noteClass('caution', 'mb-4')}>With fewer than 6 logged days we can't tell you about trends yet. Patterns get clearer as you log more.</p>}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
          <Stat label="Days logged" value={days.length} />
          <Stat label="Days with a moderate or severe symptom" value={daysWithModerate} />
          <Stat label="Most frequent symptom" value={top ? top.label : 'None logged'} note={top ? `${top.daysPresent} of ${top.daysLogged} days` : undefined} />
          <Stat label="Injections logged" value={doses.length} />
        </dl>
      </Panel>

      <Panel title="Symptom by symptom">
        {overview.length === 0 ? (
          <p className="text-sm text-muted">No positive symptom ratings recorded. Unanswered symptoms are not treated as None.</p>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
            <table className="w-full text-left text-sm">
              <thead className="border-y border-line bg-sunken text-[13px] text-ink-2"><tr><th scope="col" className="px-4 py-2 font-semibold sm:px-5">Symptom</th><th scope="col" className="px-4 py-2 font-semibold sm:px-5">Days present</th><th scope="col" className="px-4 py-2 font-semibold sm:px-5">Worst</th><th scope="col" className="px-4 py-2 font-semibold sm:px-5">Compared with earlier logs</th></tr></thead>
              <tbody className="divide-y divide-line">
                {overview.map((r) => (
                  <tr key={r.key}>
                    <td className="px-4 py-2.5 font-semibold text-ink sm:px-5">{r.label}</td>
                    <td className="px-4 py-2.5 tabular-nums text-ink-2 sm:px-5">{r.daysPresent} of {r.daysLogged}</td>
                    <td className="px-4 py-2.5 text-ink-2 sm:px-5">{severityLabel(r.peak)}</td>
                    <td className="px-4 py-2.5 text-ink-2 sm:px-5">{r.trend ? `Happening ${r.trend}` : 'Needs 6+ logged days'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Days after an injection" description="Average of common side effects (nausea, fatigue, diarrhea, constipation, bloating, reflux) on each day after a shot, from days you logged.">
          {recovery.every((p) => p.avg === null) ? (
            <p className="text-sm text-muted">Needs symptom logs made within a week after a logged injection.</p>
          ) : (
            <div className="h-[220px] w-full" role="img" aria-label="Average side-effect severity by day after injection">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recovery} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={TICK} />
                  <YAxis domain={[0, 3]} ticks={SEV_TICKS} tickFormatter={sevTick} axisLine={false} tickLine={false} tick={TICK} width={60} />
                  <Tooltip formatter={(v, _n, item) => [`${Number(v).toFixed(2)} (${(item.payload as { logs: number }).logs} logs)`, 'Average']} />
                  <Bar dataKey="avg" name="Average severity" fill="#1d5aa6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Hunger and food noise over time" description="Monthly averages of your own ratings. Solid line: hunger. Dashed line: food noise.">
          <div className="h-[220px] w-full" role="img" aria-label="Monthly average hunger and food noise ratings">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={appetite} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                <XAxis dataKey="period" axisLine={false} tickLine={false} tick={TICK} />
                <YAxis domain={[0, 3]} ticks={SEV_TICKS} tickFormatter={sevTick} axisLine={false} tickLine={false} tick={TICK} width={60} />
                <Tooltip formatter={(v) => Number(v).toFixed(2)} />
                <Legend wrapperStyle={LEGEND} />
                <Line type="monotone" dataKey="hunger" name="Hunger" stroke="#8a5300" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="foodNoise" name="Food noise" stroke="#1d5aa6" strokeWidth={2.5} strokeDasharray="7 4" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel
        title="Heatmap (worst day in each period)"
        action={<Segmented label="Heatmap period" value={heatmapMode} onChange={setHeatmapMode} options={[{ value: 'months', label: 'Months' }, { value: 'weeks', label: 'Weeks' }]} />}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-xs">
            <thead><tr><th className="pb-1 text-left font-medium text-muted"><span className="sr-only">Symptom</span></th>{heatmap.headers.map((h) => <th key={h} scope="col" className="pb-1 font-medium text-muted">{h}</th>)}</tr></thead>
            <tbody>
              {heatmap.rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row" className="whitespace-nowrap py-1 pr-3 text-left text-[13px] font-medium text-ink-2">{r.label}</th>
                  {r.cells.map((c, i) => (
                    <td key={i} className="p-0.5">
                      <div className={`flex h-7 items-center justify-center rounded-[6px] px-1 font-medium ${CELL[c ?? 'empty']}`}>{c ? severityLabel(c) : '–'}</div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[13px] text-muted">Each cell names the worst rating in that period. Grey "–" means this symptom was not recorded in that period. It does not mean "no symptoms".</p>
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel
          title="By dose level"
          description={byDose.doses.length < 2 ? undefined : `Average severity in the week after injections at each dose (${byDose.doses.map((d) => `${d.label}: ${d.logs} logs`).join(', ')}). This describes your own history. It doesn't show that a dose causes a symptom.`}
        >
          {byDose.doses.length < 2 ? (
            <p className="text-sm text-muted">Needs symptom logs after injections at two or more different doses.</p>
          ) : (
            <div className="h-[240px] w-full" role="img" aria-label="Average side-effect severity by dose level">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDose.symptoms} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                  <XAxis dataKey="symptom" axisLine={false} tickLine={false} tick={TICK} />
                  <YAxis domain={[0, 3]} ticks={SEV_TICKS} tickFormatter={sevTick} axisLine={false} tickLine={false} tick={TICK} width={60} />
                  <Tooltip />
                  <Legend wrapperStyle={LEGEND} />
                  {byDose.doses.map((d, i) => <Bar key={d.label} dataKey={d.label} fill={DOSE_COLORS[i % DOSE_COLORS.length]} radius={[3, 3, 0, 0]} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel
          title="One injection, up close"
          action={sortedDoses.length > 0 ? (
            <select aria-label="Choose an injection" value={detailDose?.id ?? ''} onChange={(e) => setSelectedDoseId(e.target.value)} className={inputClass('max-w-xs text-sm')}>
              {sortedDoses.map((d) => <option key={d.id} value={d.id}>{format(new Date(d.date), 'MMM d, yyyy')} · {d.amountMg} mg</option>)}
            </select>
          ) : undefined}
        >
          {!detailDose ? (
            <p className="text-sm text-muted">Log an injection to explore the week after it.</p>
          ) : detail && detail.logs === 0 ? (
            <p className="text-sm text-muted">No symptom logs in the 7 days after this injection.</p>
          ) : detail ? (
            <>
              <p className="mb-2 text-[13px] text-muted">{detail.logs} {detail.logs === 1 ? 'log' : 'logs'} in the 7 days after this injection</p>
              <dl className="grid grid-cols-1 gap-x-6 text-sm sm:grid-cols-2">
                {detail.averages.map((a) => (
                  <div key={a.label} className="flex justify-between gap-2 border-b border-line py-2"><dt className="text-ink-2">{a.label}</dt><dd className="font-semibold text-ink">{a.avg == null ? 'Not recorded' : sevTick(Math.round(a.avg))}</dd></div>
                ))}
              </dl>
            </>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
