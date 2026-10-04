import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { WeightLossProgressChart } from '../components/WeightLossProgressChart';
import { WeightVsTrialsChart } from '../components/WeightVsTrialsChart';
import { AnalyticsHeatmaps } from '../components/AnalyticsHeatmaps';
import { SideEffectsAnalyticsDashboard } from '../components/SideEffectsAnalyticsDashboard';
import { WeightJourneyDashboard } from '../components/WeightJourneyDashboard';
import { format } from 'date-fns';
import { bmi as calcBmi, bmiCategory, formatWeight, formatWeightChange, getWeightUnit } from '../lib/units';
import { dosesBySite, doseCountsByAmount, latestWeight, weeklyRate } from '../lib/insights';
import { SEVERITY_RANK, sevOf, sortEffects } from '../lib/symptoms';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Activity, Sparkles, TrendingUp, Compass } from 'lucide-react';

export function Results() {
  const { weights, settings, effects, doses } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'journey' | 'sideEffects' | 'progress') || 'journey';
  const [activeTab, setActiveTab] = useState<'journey' | 'sideEffects' | 'progress'>(initialTab);
  const [timeFilter, setTimeFilter] = useState('90d');

  const handleTabChange = (tab: 'journey' | 'sideEffects' | 'progress') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  
  const unit = getWeightUnit(settings);
  const effectData = sortEffects(effects).map(e => ({
    date: format(new Date(e.date), 'MMM d'),
    hunger: SEVERITY_RANK[sevOf(e, 'hunger')],
    foodNoise: SEVERITY_RANK[sevOf(e, 'foodNoise')],
    nausea: SEVERITY_RANK[sevOf(e, 'nausea')],
    fatigue: SEVERITY_RANK[sevOf(e, 'fatigue')]
  }));

  const latest = latestWeight(weights);
  const currentWeight = latest ? latest.weightLbs : null;
  const bmi = calcBmi(currentWeight, settings.heightInches);
  const bmiLabel = bmiCategory(bmi);
  const rate = weeklyRate(weights);
  const goalRemaining = currentWeight != null && settings.targetWeight > 0 ? Math.max(0, currentWeight - settings.targetWeight) : null;
  const doseCounts = doseCountsByAmount(doses);
  const siteCounts = dosesBySite(doses);
  const DOSE_COLORS = ['#cbd5e1', '#8b5cf6', '#582967', '#0d9488', '#f43f5e', '#059669'];

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-[24px] border border-[#E5E7EB] shadow-xs">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">Analytics & Insights</h1>
          <p className="text-muted text-sm font-normal mt-0.5">Explore your weight journey story, side effect trends, and clinical progress</p>
        </div>

        {/* 3-Tab Selector */}
        <div className="flex bg-[#F8F9FC] p-1 rounded-[14px] border border-[#E5E7EB] shadow-xs overflow-x-auto">
          <button
            aria-pressed={activeTab === 'journey'}
            onClick={() => handleTabChange('journey')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-[10px] transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'journey'
                ? 'bg-white text-[#111827] shadow-xs'
                : 'text-muted hover:text-[#111827]'
            }`}
          >
            <Compass className="w-4 h-4 text-[#6D4AFF]" />
            <span>Weight Journey</span>
          </button>

          <button
            aria-pressed={activeTab === 'sideEffects'}
            onClick={() => handleTabChange('sideEffects')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-[10px] transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'sideEffects'
                ? 'bg-white text-[#111827] shadow-xs'
                : 'text-muted hover:text-[#111827]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-caution" />
            <span>Side Effects Overview</span>
          </button>

          <button
            aria-pressed={activeTab === 'progress'}
            onClick={() => handleTabChange('progress')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-[10px] transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'progress'
                ? 'bg-white text-[#111827] shadow-xs'
                : 'text-muted hover:text-[#111827]'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-positive" />
            <span>Progress & Benchmarks</span>
          </button>
        </div>
      </header>

      {activeTab === 'journey' && (
        <WeightJourneyDashboard />
      )}

      {activeTab === 'sideEffects' && (
        <SideEffectsAnalyticsDashboard />
      )}

      {activeTab === 'progress' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <div className="flex bg-[#F1F5F9] p-1 rounded-[16px] text-xs font-semibold text-muted">
              {['2w', '1m', '3m', '90d', 'All'].map(filter => (
                <button
                  key={filter}
                  aria-pressed={timeFilter === filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    timeFilter === filter ? 'bg-white shadow-xs text-[#111827] font-semibold' : 'hover:text-[#111827]'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="rounded-[16px] border-[#E5E7EB] shadow-xs">
              <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                <span className="text-xs font-semibold text-muted mb-1">Current BMI</span>
                <span className="text-3xl font-black text-[#111827] tracking-tight">{bmi == null ? '–' : bmi.toFixed(1)}</span>
                <span className="text-[11px] text-subtle mt-0.5">{bmiLabel ?? (settings.heightInches > 0 ? 'Log a weight' : 'Add your height in Settings')}</span>
              </CardContent>
            </Card>
            <Card className="rounded-[16px] border-[#E5E7EB] shadow-xs">
              <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                <span className="text-xs font-semibold text-muted mb-1">Recent weekly trend</span>
                <span className="text-3xl font-black text-[#111827] tracking-tight">{rate ? formatWeightChange(rate.lbsPerWeek, unit, { unit: false }) : '–'}<span className="text-xs font-semibold text-muted"> {unit}/wk</span></span>
                <span className="text-[11px] text-subtle mt-0.5">{rate ? `${rate.points} weigh-ins, ${rate.spanDays} days` : 'Needs 3+ weigh-ins over 2+ weeks'}</span>
              </CardContent>
            </Card>
            <Card className="col-span-2 rounded-[16px] border-[#E5E7EB] shadow-xs">
              <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                <span className="text-xs font-semibold text-muted mb-1">Goal remaining</span>
                <span className="text-3xl font-black text-[#111827] tracking-tight">{goalRemaining == null ? '–' : formatWeight(goalRemaining, unit, { unit: false })} <span className="text-xs font-semibold text-muted">{unit}</span></span>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <WeightLossProgressChart />
            </div>

            <div className="col-span-1 md:col-span-2">
              <WeightVsTrialsChart />
            </div>

            <div className="col-span-1 md:col-span-2">
              <AnalyticsHeatmaps />
            </div>

            <Card className="rounded-[24px] border-[#E5E7EB] shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#111827]">Appetite & Food Noise</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={effectData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569' }} dy={10} minTickGap={20} />
                      <YAxis domain={[0, 3]} ticks={[0, 1, 2, 3]} tickFormatter={(val) => ['None', 'Mild', 'Mod', 'Sev'][val]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569' }} width={45} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Line type="monotone" dataKey="hunger" name="Hunger" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="foodNoise" name="Food Noise" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border-[#E5E7EB] shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#111827]">Nausea & Fatigue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={effectData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569' }} dy={10} minTickGap={20} />
                      <YAxis domain={[0, 3]} ticks={[0, 1, 2, 3]} tickFormatter={(val) => ['None', 'Mild', 'Mod', 'Sev'][val]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569' }} width={45} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Line type="monotone" dataKey="nausea" name="Nausea" stroke="#ef4444" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="fatigue" name="Fatigue" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border-[#E5E7EB] shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#111827]">Injection sites used</CardTitle>
              </CardHeader>
              <CardContent>
                {siteCounts.length === 0 ? (
                  <p className="text-xs text-muted py-10 text-center">Log a dose to see which sites you've used.</p>
                ) : (
                  <div className="h-[250px] w-full mt-2" role="img" aria-label={`Injections per site: ${siteCounts.map((x) => `${x.site} ${x.count}`).join(', ')}`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={siteCounts} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569' }} />
                        <YAxis type="category" dataKey="site" width={110} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569' }} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="count" name="Injections" fill="#582967" radius={[0, 6, 6, 0]} barSize={18} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border-[#E5E7EB] shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#111827]">Dose breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {doseCounts.length === 0 ? (
                  <p className="text-xs text-muted py-10 text-center">Log a dose to see how many injections you've had at each dose.</p>
                ) : (
                  <div className="h-[250px] w-full mt-2 flex items-center justify-center" role="img" aria-label={`Injections by dose: ${doseCounts.map((x) => `${x.label} ${x.count}`).join(', ')}`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={doseCounts} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="count" nameKey="label"
                          label={({ name, value }) => `${name}: ${value}`}>
                          {doseCounts.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={DOSE_COLORS[index % DOSE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}


