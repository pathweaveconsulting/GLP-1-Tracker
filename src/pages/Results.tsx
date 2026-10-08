import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { EmptyState, PageHeader, Panel, Segmented, Stat } from '../components/ds';
import { WeightLossProgressChart } from '../components/WeightLossProgressChart';
import { WeightVsTrialsChart } from '../components/WeightVsTrialsChart';
import { AnalyticsHeatmaps } from '../components/AnalyticsHeatmaps';
import { SideEffectsAnalyticsDashboard } from '../components/SideEffectsAnalyticsDashboard';
import { WeightJourneyDashboard } from '../components/WeightJourneyDashboard';
import { format } from 'date-fns';
import { BMI_FOOTNOTE, bmi as calcBmi, bmiCategory, formatWeight, formatWeightChange, getWeightUnit } from '../lib/units';
import { dosesBySite, doseCountsByAmount, latestWeight, weeklyRate } from '../lib/insights';
import { severityValue, sevOf, sortEffects } from '../lib/symptoms';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from 'recharts';

export function Results() {
  const { weights, settings, effects, doses } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'journey' | 'sideEffects' | 'progress') || 'journey';
  const [activeTab, setActiveTab] = useState<'journey' | 'sideEffects' | 'progress'>(initialTab);

  const handleTabChange = (tab: 'journey' | 'sideEffects' | 'progress') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  
  const unit = getWeightUnit(settings);
  const effectData = sortEffects(effects).map(e => ({
    date: format(new Date(e.date), 'MMM d'),
    hunger: severityValue(sevOf(e, 'hunger')),
    foodNoise: severityValue(sevOf(e, 'foodNoise')),
    nausea: severityValue(sevOf(e, 'nausea')),
    fatigue: severityValue(sevOf(e, 'fatigue'))
  }));

  const latest = latestWeight(weights);
  const currentWeight = latest ? latest.weightLbs : null;
  const bmi = calcBmi(currentWeight, settings.heightInches);
  const bmiLabel = bmiCategory(bmi);
  const rate = weeklyRate(weights);
  const goalRemaining = currentWeight != null && settings.targetWeight > 0 ? Math.max(0, currentWeight - settings.targetWeight) : null;
  const doseCounts = doseCountsByAmount(doses);
  const siteCounts = dosesBySite(doses);
  const maxDoseCount = Math.max(1, ...doseCounts.map((x) => x.count));

  return (
    <div className="space-y-5">
      <PageHeader title="Insights" description="Your weight journey, side-effect patterns and progress, compared with your own history." />

      <Segmented
        label="Insights view"
        value={activeTab}
        onChange={handleTabChange}
        options={[
          { value: 'journey', label: 'Weight Journey' },
          { value: 'sideEffects', label: 'Side Effects Overview' },
          { value: 'progress', label: 'Progress & Benchmarks' },
        ]}
      />

      {activeTab === 'journey' && (
        <WeightJourneyDashboard />
      )}

      {activeTab === 'sideEffects' && (
        <SideEffectsAnalyticsDashboard />
      )}

      {activeTab === 'progress' && (
        <div className="space-y-5">
          <Panel title="Where you are now">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
              <Stat
                label="Current BMI"
                value={bmi == null ? '–' : bmi.toFixed(1)}
                note={<>{bmiLabel ?? (settings.heightInches > 0 ? 'Log a weight' : 'Add your height in Settings')}{bmiLabel && <span className="mt-1 block">{BMI_FOOTNOTE}</span>}</>}
              />
              <Stat
                label="Recent weekly trend"
                value={rate ? formatWeightChange(rate.lbsPerWeek, unit, { unit: false }) : '–'}
                unit={`${unit}/wk`}
                note={rate ? `${rate.points} weigh-ins, ${rate.spanDays} days` : 'Needs 3+ weigh-ins over 2+ weeks'}
              />
              <Stat label="Goal remaining" value={goalRemaining == null ? '–' : formatWeight(goalRemaining, unit, { unit: false })} unit={goalRemaining == null ? undefined : unit} />
            </dl>
          </Panel>

          <WeightLossProgressChart />
          <WeightVsTrialsChart />
          <AnalyticsHeatmaps />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Panel title="Appetite and food noise" description="Each check-in's rating. Solid line: hunger. Dashed line: food noise.">
              <div className="h-[250px] w-full" role="img" aria-label="Hunger and food noise ratings at each check-in">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={effectData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={TICK} dy={8} minTickGap={20} />
                    <YAxis domain={[0, 3]} ticks={[0, 1, 2, 3]} tickFormatter={sevTick} axisLine={false} tickLine={false} tick={TICK} width={64} />
                    <Tooltip contentStyle={TOOLTIP} />
                    <Legend wrapperStyle={LEGEND} />
                    <Line type="monotone" dataKey="hunger" name="Hunger" stroke="#8a5300" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="foodNoise" name="Food noise" stroke="#1d5aa6" strokeWidth={2.5} strokeDasharray="7 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Nausea and fatigue" description="Each check-in's rating. Solid line: nausea. Dashed line: fatigue.">
              <div className="h-[250px] w-full" role="img" aria-label="Nausea and fatigue ratings at each check-in">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={effectData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={TICK} dy={8} minTickGap={20} />
                    <YAxis domain={[0, 3]} ticks={[0, 1, 2, 3]} tickFormatter={sevTick} axisLine={false} tickLine={false} tick={TICK} width={64} />
                    <Tooltip contentStyle={TOOLTIP} />
                    <Legend wrapperStyle={LEGEND} />
                    <Line type="monotone" dataKey="nausea" name="Nausea" stroke="#b42318" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="fatigue" name="Fatigue" stroke="#164a8a" strokeWidth={2.5} strokeDasharray="7 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Injection sites used">
              {siteCounts.length === 0 ? (
                <EmptyState title="No injections recorded yet">Log a dose to see which sites you've used.</EmptyState>
              ) : (
                <div className="h-[250px] w-full" role="img" aria-label={`Injections per site: ${siteCounts.map((x) => `${x.site} ${x.count}`).join(', ')}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={siteCounts} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                      <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={TICK} />
                      <YAxis type="category" dataKey="site" width={120} axisLine={false} tickLine={false} tick={TICK} />
                      <Tooltip contentStyle={TOOLTIP} />
                      <Bar dataKey="count" name="Injections" fill="#1d5aa6" radius={[0, 4, 4, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel title="Dose breakdown" description={doseCounts.length ? 'Number of recorded injections at each dose.' : undefined}>
              {doseCounts.length === 0 ? (
                <EmptyState title="No injections recorded yet">Log a dose to see how many injections you've had at each dose.</EmptyState>
              ) : (
                <ul className="space-y-3" aria-label={`Injections by dose: ${doseCounts.map((x) => `${x.label} ${x.count}`).join(', ')}`}>
                  {doseCounts.map((x) => (
                    <li key={x.label}>
                      <div className="flex justify-between text-sm"><span className="text-ink-2">{x.label}</span><span className="font-semibold tabular-nums text-ink">{x.count}</span></div>
                      <div className="mt-1 h-2 rounded-full bg-sunken" aria-hidden="true"><div className="h-2 rounded-full bg-brand" style={{ width: `${(x.count / maxDoseCount) * 100}%` }} /></div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

const GRID = '#e3e8ef';
const TICK = { fontSize: 12, fill: '#4f5d70' };
const LEGEND = { fontSize: 13, color: '#2e3e54' };
const TOOLTIP = { borderRadius: 10, border: '1px solid #7b8a9c', boxShadow: 'none' };
const sevTick = (val: number) => ['None', 'Mild', 'Moderate', 'Severe'][val] ?? '';
