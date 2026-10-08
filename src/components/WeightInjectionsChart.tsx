import { useState } from 'react';
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { useStore } from '../store/useStore';
import { getWeightUnit, lbsToDisplay } from '../lib/units';
import { Panel } from './ds';

const RANGES = { '8 weeks': 8, '4 weeks': 4, '12 weeks': 12, '16 weeks': 16 } as const;
type Range = keyof typeof RANGES;

/**
 * Weekly average weight (line with point markers) beside the number of injections recorded that week (bars).
 * The two series differ in shape as well as colour. Weeks without a weigh-in stay empty: nothing is interpolated.
 */
export function WeightInjectionsChart() {
  const { weights, doses, settings } = useStore();
  const unit = getWeightUnit(settings);
  const [range, setRange] = useState<Range>('8 weeks');

  const now = new Date();
  const rows = Array.from({ length: RANGES[range] }, (_, i) => {
    const target = subDays(now, (RANGES[range] - 1 - i) * 7);
    const from = startOfWeek(target, { weekStartsOn: 1 });
    const to = endOfWeek(target, { weekStartsOn: 1 });
    const inWeek = (iso: string) => { const d = new Date(iso); return d >= from && d <= to; };
    const ws = weights.filter((w) => inWeek(w.date));
    return {
      week: `Wk of ${format(from, 'd MMM')}`,
      weight: ws.length ? lbsToDisplay(ws.reduce((a, w) => a + w.weightLbs, 0) / ws.length, unit) : null,
      injections: doses.filter((d) => inWeek(d.date)).length,
    };
  });
  const hasWeight = rows.some((r) => r.weight != null);

  return (
    <Panel
      title="Weight and injections by week"
      description="Weekly average weight and the number of injections you recorded each week."
      action={
        <div role="group" aria-label="Chart range" className="flex rounded-[var(--radius-control)] bg-sunken p-0.5 text-[13px]">
          {(Object.keys(RANGES) as Range[]).map((r) => (
            <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}
              className={`min-h-8 rounded-[8px] px-2.5 font-medium ${range === r ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>
              {r}
            </button>
          ))}
        </div>
      }
    >
      <div className="relative h-64" role="img" aria-label={`Weekly average weight and injections over the last ${range}.`}>
        {!hasWeight && <p className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center text-[13px] text-muted">No weigh-ins in this period. Injections are still shown.</p>}
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbe2ea" />
            <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4f5d70' }} dy={8} />
            <YAxis yAxisId="w" domain={['dataMin - 3', 'dataMax + 3']} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4f5d70' }} />
            <YAxis yAxisId="d" orientation="right" domain={[0, 'dataMax + 1']} allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4f5d70' }} />
            <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #dbe2ea' }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="d" dataKey="injections" name="Injections recorded" fill="#6b8fc0" barSize={16} radius={[3, 3, 0, 0]} />
            <Line yAxisId="w" type="monotone" dataKey="weight" name={`Weekly average weight (${unit})`} stroke="#164a8a" strokeWidth={2}
              connectNulls={false} dot={{ r: 3.5, fill: '#164a8a', strokeWidth: 0 }} activeDot={{ r: 5 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
