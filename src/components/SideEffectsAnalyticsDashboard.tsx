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

interface Props {
  className?: string;
}

const card = 'bg-white p-6 rounded-[var(--radius-panel)] border border-line ';
const SEV_TICKS = [0, 1, 2, 3];
const sevTick = (v: number) => ['None', 'Mild', 'Mod', 'Severe'][v] ?? '';
const DOSE_COLORS = ['#047857', '#3b82f6', '#b45309', '#ef4444', '#1d5aa6', '#0d9488'];

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
      <div className={`space-y-6 ${className}`}>
        <div className={card}>
          <h2 className="text-xl font-semibold text-ink tracking-tight">Side Effects Overview</h2>
          <p className="text-sm text-muted mt-2">
            You haven't logged any symptoms yet. <Link to="/effects" className="text-brand font-semibold hover:underline">Log how you feel</Link> and this page will show how often each symptom shows up, when in the week, and how it changes over time. It only ever uses your own entries.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className={card}>
        <h2 className="text-xl font-semibold text-ink tracking-tight">Side Effects Overview</h2>
        <p className="text-sm text-muted mt-0.5">
          Based on {logs.length} symptom {logs.length === 1 ? 'log' : 'logs'} from {format(new Date(logs[0].date), 'MMM d, yyyy')} to {format(new Date(logs[logs.length - 1].date), 'MMM d, yyyy')}. Compared with your own history, not with anyone else. Day counts and trends use the highest recorded severity per local day.
        </p>
        {days.length < 6 && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-[var(--radius-control)] px-3 py-2 mt-3">With fewer than 6 logged days we can't tell you about trends yet. Patterns get clearer as you log more.</p>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={card}><div className="text-xs text-muted">Days logged</div><div className="text-3xl font-semibold text-ink mt-1">{days.length}</div></div>
        <div className={card}><div className="text-xs text-muted">Days with a moderate or severe symptom</div><div className="text-3xl font-semibold text-ink mt-1">{daysWithModerate}</div></div>
        <div className={card}><div className="text-xs text-muted">Most frequent symptom</div><div className="text-lg font-semibold text-ink mt-1">{top ? top.label : 'None logged'}</div>{top && <div className="text-[11px] text-subtle">{top.daysPresent} of {top.daysLogged} days</div>}</div>
        <div className={card}><div className="text-xs text-muted">Injections logged</div><div className="text-3xl font-semibold text-ink mt-1">{doses.length}</div></div>
      </div>

      <section aria-labelledby="se-table" className={card}>
        <h3 id="se-table" className="text-base font-semibold text-ink mb-3">Symptom by symptom</h3>
        {overview.length === 0 ? (
          <p className="text-xs text-muted">No positive symptom ratings recorded. Unanswered symptoms are not treated as None.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead><tr className="text-subtle"><th className="py-2 font-medium">Symptom</th><th className="py-2 font-medium">Days present</th><th className="py-2 font-medium">Worst</th><th className="py-2 font-medium">Compared with earlier logs</th></tr></thead>
              <tbody>
                {overview.map((r) => (
                  <tr key={r.key} className="border-t border-sunken">
                    <td className="py-2.5 font-semibold text-ink">{r.label}</td>
                    <td className="py-2.5 text-muted">{r.daysPresent} of {r.daysLogged}</td>
                    <td className="py-2.5 text-muted">{severityLabel(r.peak)}</td>
                    <td className="py-2.5 text-muted">{r.trend ? `Happening ${r.trend}` : 'Needs 6+ logged days'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section aria-labelledby="se-recovery" className={card}>
          <h3 id="se-recovery" className="text-base font-semibold text-ink">Days after an injection</h3>
          <p className="text-xs text-muted mb-3">Average of common side effects (nausea, fatigue, diarrhea, constipation, bloating, reflux) on each day after a shot, from days you logged.</p>
          {recovery.every((p) => p.avg === null) ? (
            <p className="text-xs text-muted">Needs symptom logs made within a week after a logged injection.</p>
          ) : (
            <div className="h-[220px] w-full" role="img" aria-label="Average side-effect severity by day after injection">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recovery} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569' }} />
                  <YAxis domain={[0, 3]} ticks={SEV_TICKS} tickFormatter={sevTick} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569' }} width={48} />
                  <Tooltip formatter={(v, _n, item) => [`${Number(v).toFixed(2)} (${(item.payload as { logs: number }).logs} logs)`, 'Average']} />
                  <Bar dataKey="avg" name="Average severity" fill="#b45309" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section aria-labelledby="se-appetite" className={card}>
          <h3 id="se-appetite" className="text-base font-semibold text-ink">Hunger and food noise over time</h3>
          <p className="text-xs text-muted mb-3">Monthly averages of your own ratings.</p>
          <div className="h-[220px] w-full" role="img" aria-label="Monthly average hunger and food noise ratings">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={appetite} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis domain={[0, 3]} ticks={SEV_TICKS} tickFormatter={sevTick} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569' }} width={48} />
                <Tooltip formatter={(v) => Number(v).toFixed(2)} />
                <Legend />
                <Line type="monotone" dataKey="hunger" name="Hunger" stroke="#b45309" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="foodNoise" name="Food noise" stroke="#1d5aa6" strokeWidth={2.5} strokeDasharray="7 4" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section aria-labelledby="se-heatmap" className={card}>
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h3 id="se-heatmap" className="text-base font-semibold text-ink">Heatmap (worst day in each period)</h3>
          <div className="flex bg-canvas p-1 rounded-[var(--radius-control)] border border-line text-xs font-medium" role="group" aria-label="Heatmap period">
            {(['months', 'weeks'] as const).map((m) => (
              <button key={m} type="button" aria-pressed={heatmapMode === m} onClick={() => setHeatmapMode(m)}
                className={`px-3 py-1 rounded-[8px] capitalize ${heatmapMode === m ? 'bg-white font-semibold text-ink' : 'text-muted'}`}>{m}</button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="text-[10px] w-full min-w-[420px]">
            <thead><tr><th className="text-left font-medium text-subtle pb-1"><span className="sr-only">Symptom</span></th>{heatmap.headers.map((h) => <th key={h} className="font-medium text-subtle pb-1">{h}</th>)}</tr></thead>
            <tbody>
              {heatmap.rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row" className="text-left text-xs font-medium text-ink-2 pr-3 py-1 whitespace-nowrap">{r.label}</th>
                  {r.cells.map((c, i) => (
                    <td key={i} className="p-0.5">
                      <div className={`h-6 rounded-md flex items-center justify-center font-medium ${CELL[c ?? 'empty']}`}>{c ? severityLabel(c).slice(0, 3) : '–'}</div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-subtle mt-2">Grey "–" means this symptom was not recorded in that period. It does not mean "no symptoms".</p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section aria-labelledby="se-dose" className={card}>
          <h3 id="se-dose" className="text-base font-semibold text-ink">By dose level</h3>
          {byDose.doses.length < 2 ? (
            <p className="text-xs text-muted mt-2">Needs symptom logs after injections at two or more different doses.</p>
          ) : (
            <>
              <p className="text-xs text-muted mb-2">Average severity in the week after injections at each dose ({byDose.doses.map((d) => `${d.label}: ${d.logs} logs`).join(', ')}). This describes your own history. It doesn't show that a dose causes a symptom.</p>
              <div className="h-[240px] w-full" role="img" aria-label="Average side-effect severity by dose level">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byDose.symptoms} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="symptom" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569' }} />
                    <YAxis domain={[0, 3]} ticks={SEV_TICKS} tickFormatter={sevTick} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569' }} width={48} />
                    <Tooltip />
                    <Legend />
                    {byDose.doses.map((d, i) => <Bar key={d.label} dataKey={d.label} fill={DOSE_COLORS[i % DOSE_COLORS.length]} radius={[3, 3, 0, 0]} />)}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </section>

        <section aria-labelledby="se-inj" className={card}>
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <h3 id="se-inj" className="text-base font-semibold text-ink">One injection, up close</h3>
            {sortedDoses.length > 0 && (
              <select aria-label="Choose an injection" value={detailDose?.id ?? ''} onChange={(e) => setSelectedDoseId(e.target.value)}
                className="text-xs rounded-[var(--radius-control)] border border-line bg-canvas px-3 py-1.5">
                {sortedDoses.map((d) => <option key={d.id} value={d.id}>{format(new Date(d.date), 'MMM d, yyyy')} · {d.amountMg} mg</option>)}
              </select>
            )}
          </div>
          {!detailDose ? (
            <p className="text-xs text-muted">Log an injection to explore the week after it.</p>
          ) : detail && detail.logs === 0 ? (
            <p className="text-xs text-muted">No symptom logs in the 7 days after this injection.</p>
          ) : detail ? (
            <>
              <p className="text-[11px] text-subtle mb-2">{detail.logs} {detail.logs === 1 ? 'log' : 'logs'} in the 7 days after this injection</p>
              <ul className="grid grid-cols-2 gap-2 text-xs">
                {detail.averages.map((a) => (
                  <li key={a.label} className="flex justify-between p-2.5 rounded-[var(--radius-control)] bg-canvas border border-line"><span className="text-ink-2">{a.label}</span><span className="font-semibold text-ink">{a.avg == null ? 'Not recorded' : sevTick(Math.round(a.avg))}</span></li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
