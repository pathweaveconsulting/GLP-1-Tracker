import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { WeightLossProgressChart } from '../components/WeightLossProgressChart';
import { format } from 'date-fns';
import { Scale, TrendingDown, TrendingUp, Plus, Upload, Trash2, Sparkles, ListFilter, Compass } from 'lucide-react';
import { LogWeightModal } from '../components/modals/LogWeightModal';
import { WeightJourneyDashboard } from '../components/WeightJourneyDashboard';

export function Weight() {
  const { weights, deleteWeight, settings } = useStore();
  const [activeTab, setActiveTab] = useState<'journey' | 'table'>('journey');
  const [isLogWeightOpen, setIsLogWeightOpen] = useState(false);
  
  const sortedWeights = [...weights].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const latestWeight = sortedWeights.length > 0 ? sortedWeights[0].weightLbs : settings.startingWeight;
  const totalLost = settings.startingWeight - latestWeight;
  const percentChange = (totalLost / settings.startingWeight) * 100;
  const goalRemaining = latestWeight - settings.targetWeight;

  const handleImportCSV = () => {
    alert("CSV Import Ready: Select a valid .csv file containing Date, Weight(lbs).");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">Weight Journey</h1>
          <p className="text-[#667085] text-sm mt-0.5">Target goal: {settings.targetWeight} lbs ({ (settings.targetWeight / 2.20462).toFixed(1) } kg)</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View Tab Selector */}
          <div className="flex bg-[#F8F9FC] p-1 rounded-[14px] border border-[#E5E7EB] shadow-xs">
            <button
              onClick={() => setActiveTab('journey')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-[10px] transition-all ${
                activeTab === 'journey'
                  ? 'bg-white text-[#111827] shadow-xs'
                  : 'text-[#667085] hover:text-[#111827]'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-[#6D4AFF]" />
              <span>Weight Journey Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-[10px] transition-all ${
                activeTab === 'table'
                  ? 'bg-white text-[#111827] shadow-xs'
                  : 'text-[#667085] hover:text-[#111827]'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5 text-[#667085]" />
              <span>Weight Log & Table</span>
            </button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="icon" title="Import CSV" onClick={handleImportCSV} className="rounded-[14px] border-[#E5E7EB]">
              <Upload className="w-4 h-4 text-[#667085]" />
            </Button>
            <Button onClick={() => setIsLogWeightOpen(true)} className="gap-2 bg-[#22C55E] hover:bg-[#22C55E] text-white rounded-[14px] shadow-xs px-4 py-2.5 text-xs font-semibold">
              <Plus className="w-4 h-4" />
              <span>Record Weight</span>
            </Button>
          </div>
        </div>
      </header>

      {activeTab === 'journey' ? (
        <WeightJourneyDashboard />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="rounded-[16px] border-[#E5E7EB] shadow-xs">
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-xs font-semibold text-[#667085] tracking-wider mb-1">Current Weight</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tighter text-[#111827]">{latestWeight.toFixed(1)}</span>
                  <span className="text-xs font-semibold text-[#667085]">lbs</span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="rounded-[16px] border-[#E5E7EB] shadow-xs">
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-xs font-semibold text-[#667085] tracking-wider mb-1">Total Loss</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tighter text-[#22C55E]">-{totalLost.toFixed(1)}</span>
                  <span className="text-xs font-semibold text-[#667085]">lbs</span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[16px] border-[#E5E7EB] shadow-xs">
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-xs font-semibold text-[#667085] tracking-wider mb-1">% Change</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tighter text-[#22C55E]">-{percentChange.toFixed(1)}</span>
                  <span className="text-xs font-semibold text-[#667085]">%</span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[16px] border-[#E5E7EB] shadow-xs">
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-xs font-semibold text-[#667085] tracking-wider mb-1">To Goal</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tighter text-[#111827]">{Math.max(0, goalRemaining).toFixed(1)}</span>
                  <span className="text-xs font-semibold text-[#667085]">lbs</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <WeightLossProgressChart />

          <Card className="rounded-[24px] border-[#E5E7EB] shadow-xs p-2">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-[#111827]">Log History ({sortedWeights.length})</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-[#98A2B3] bg-[#F8F9FC]/80 border-y border-[#E5E7EB]">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Date</th>
                    <th className="px-6 py-3 font-semibold">Weight</th>
                    <th className="px-6 py-3 font-semibold">Change</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedWeights.map((w, index) => {
                    const prevWeight = index < sortedWeights.length - 1 ? sortedWeights[index + 1].weightLbs : w.weightLbs;
                    const change = w.weightLbs - prevWeight;
                    const isLoss = change < 0;
                    
                    return (
                      <tr key={w.id} className="hover:bg-[#F8F9FC]/60 transition-colors">
                        <td className="px-6 py-4 font-medium text-[#111827]">{format(new Date(w.date), 'MMM d, yyyy')}</td>
                        <td className="px-6 py-4 font-semibold text-[#111827]">{w.weightLbs.toFixed(1)} lbs</td>
                        <td className="px-6 py-4 font-semibold">
                          {change !== 0 ? (
                            <span className={`inline-flex items-center gap-1 ${isLoss ? 'text-[#22C55E]' : 'text-rose-500'}`}>
                              {isLoss ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                              {Math.abs(change).toFixed(1)} lbs
                            </span>
                          ) : (
                            <span className="text-[#D0D5DD]">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => deleteWeight(w.id)} 
                            className="text-[#98A2B3] hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <LogWeightModal 
        isOpen={isLogWeightOpen} 
        onClose={() => setIsLogWeightOpen(false)} 
      />
    </div>
  );
}
