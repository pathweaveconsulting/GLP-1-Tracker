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
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Activity, Sparkles, TrendingUp, Compass } from 'lucide-react';

export function Results() {
  const { weights, settings, effects } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'journey' | 'sideEffects' | 'progress') || 'journey';
  const [activeTab, setActiveTab] = useState<'journey' | 'sideEffects' | 'progress'>(initialTab);
  const [timeFilter, setTimeFilter] = useState('90d');

  const handleTabChange = (tab: 'journey' | 'sideEffects' | 'progress') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  
  const severityValue = { 'none': 0, 'mild': 1, 'moderate': 2, 'severe': 3 };
  const effectData = effects
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(e => ({
      date: format(new Date(e.date), 'MMM d'),
      hunger: severityValue[e.hunger],
      foodNoise: severityValue[e.foodNoise],
      nausea: severityValue[e.nausea],
      fatigue: severityValue[e.fatigue]
    }));

  const currentWeight = weights.length > 0 ? weights[weights.length - 1].weightLbs : settings.startingWeight;
  const bmi = (currentWeight / (settings.heightInches * settings.heightInches)) * 703;

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-[24px] border border-[#E5E7EB] shadow-xs">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">Analytics & Insights</h1>
          <p className="text-[#667085] text-sm font-normal mt-0.5">Explore your weight journey story, side effect trends, and clinical progress</p>
        </div>

        {/* 3-Tab Selector */}
        <div className="flex bg-[#F8F9FC] p-1 rounded-[14px] border border-[#E5E7EB] shadow-xs overflow-x-auto">
          <button
            onClick={() => handleTabChange('journey')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-[10px] transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'journey'
                ? 'bg-white text-[#111827] shadow-xs'
                : 'text-[#667085] hover:text-[#111827]'
            }`}
          >
            <Compass className="w-4 h-4 text-[#6D4AFF]" />
            <span>Weight Journey</span>
          </button>

          <button
            onClick={() => handleTabChange('sideEffects')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-[10px] transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'sideEffects'
                ? 'bg-white text-[#111827] shadow-xs'
                : 'text-[#667085] hover:text-[#111827]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#F59E0B]" />
            <span>Side Effects Overview</span>
          </button>

          <button
            onClick={() => handleTabChange('progress')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-[10px] transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'progress'
                ? 'bg-white text-[#111827] shadow-xs'
                : 'text-[#667085] hover:text-[#111827]'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-[#22C55E]" />
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
            <div className="flex bg-[#F1F5F9] p-1 rounded-[16px] text-xs font-semibold text-[#667085]">
              {['2w', '1m', '3m', '90d', 'All'].map(filter => (
                <button
                  key={filter}
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
                <span className="text-xs font-semibold text-[#98A2B3] tracking-wider mb-1">Current BMI</span>
                <span className="text-3xl font-black text-[#111827] tracking-tight">{bmi.toFixed(1)}</span>
              </CardContent>
            </Card>
            <Card className="rounded-[16px] border-[#E5E7EB] shadow-xs">
              <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                <span className="text-xs font-semibold text-[#98A2B3] tracking-wider mb-1">Weekly Avg Loss</span>
                <span className="text-3xl font-black text-[#22C55E] tracking-tight">-1.4<span className="text-xs font-semibold text-[#667085]">lbs</span></span>
              </CardContent>
            </Card>
            <Card className="col-span-2 rounded-[16px] border-[#E5E7EB] shadow-xs">
              <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                <span className="text-xs font-semibold text-[#98A2B3] tracking-wider mb-1">Goal Remaining</span>
                <span className="text-3xl font-black text-[#111827] tracking-tight">{(currentWeight - settings.targetWeight).toFixed(1)} <span className="text-xs font-semibold text-[#667085]">lbs</span></span>
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
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} minTickGap={20} />
                      <YAxis domain={[0, 3]} ticks={[0, 1, 2, 3]} tickFormatter={(val) => ['None', 'Mild', 'Mod', 'Sev'][val]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} width={45} />
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
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} minTickGap={20} />
                      <YAxis domain={[0, 3]} ticks={[0, 1, 2, 3]} tickFormatter={(val) => ['None', 'Mild', 'Mod', 'Sev'][val]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} width={45} />
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
                <CardTitle className="text-base font-semibold text-[#111827]">Shot Site Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { site: 'Left Thigh', shots: 4, loss: 5.2 },
                      { site: 'Right Thigh', shots: 4, loss: 4.8 },
                    ]} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="site" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                      <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Bar yAxisId="left" dataKey="shots" name="Total Shots" fill="#582967" radius={[6, 6, 0, 0]} barSize={32} />
                      <Bar yAxisId="right" dataKey="loss" name="Avg Loss (lbs)" fill="#10b981" radius={[6, 6, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border-[#E5E7EB] shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-[#111827]">Dose Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full mt-2 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: '2.5mg', value: 4 },
                          { name: '5.0mg', value: 5 }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {[
                          { name: '2.5mg', value: 4 },
                          { name: '5.0mg', value: 5 }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#cbd5e1' : '#582967'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}


