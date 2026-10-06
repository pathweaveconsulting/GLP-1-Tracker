import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { format } from 'date-fns';
import { Plus, Activity, Smile, Sparkles, ListFilter } from 'lucide-react';
import { Severity } from '../types';
import { LogEffectsModal } from '../components/modals/LogEffectsModal';
import { SideEffectsAnalyticsDashboard } from '../components/SideEffectsAnalyticsDashboard';

const severityColorMap: Record<Severity, string> = {
  none: 'bg-[#F1F5F9] text-muted',
  mild: 'bg-amber-100 text-amber-800',
  moderate: 'bg-orange-100 text-orange-800',
  severe: 'bg-rose-100 text-rose-800'
};

const SymptomChip = ({ label, severity }: { label: string; severity: Severity | undefined; key?: string }) => {
  if (!severity || severity === 'none') return null;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${severityColorMap[severity]}`}>
      {label}: {severity}
    </span>
  );
};

export function Effects() {
  const { effects } = useStore();
  const [activeTab, setActiveTab] = useState<'analytics' | 'log'>('analytics');
  const [isLogEffectsOpen, setIsLogEffectsOpen] = useState(false);
  
  const sortedEffects = [...effects].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">Side Effects</h1>
          <p className="text-muted text-sm mt-0.5">Track body adaptation, side effect trends, and daily logs</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View Tab Selector */}
          <div className="flex bg-[#F8F9FC] p-1 rounded-[14px] border border-[#E5E7EB] shadow-xs">
            <button
              aria-pressed={activeTab === 'analytics'}
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-[10px] transition-all ${
                activeTab === 'analytics'
                  ? 'bg-white text-[#111827] shadow-xs'
                  : 'text-muted hover:text-[#111827]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#6D4AFF]" />
              <span>Analytics Dashboard</span>
            </button>
            <button
              aria-pressed={activeTab === 'log'}
              onClick={() => setActiveTab('log')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-[10px] transition-all ${
                activeTab === 'log'
                  ? 'bg-white text-[#111827] shadow-xs'
                  : 'text-muted hover:text-[#111827]'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5 text-muted" />
              <span>Symptom Log History</span>
            </button>
          </div>

          <Button onClick={() => setIsLogEffectsOpen(true)} className="gap-2 bg-amber-700 hover:bg-amber-800 text-white rounded-[14px] shadow-xs px-4 py-2.5 text-xs font-semibold">
            <Plus className="w-4 h-4" />
            <span>Record Symptoms</span>
          </Button>
        </div>
      </header>

      {activeTab === 'analytics' ? (
        <SideEffectsAnalyticsDashboard />
      ) : (
        <div className="grid gap-4">
          {sortedEffects.map((effect) => {
            const customList = effect.customEffects ? Object.entries(effect.customEffects) : [];
            const hasSymptoms = Object.entries(effect).some(([key, val]) => 
              key !== 'id' && key !== 'date' && key !== 'notes' && key !== 'customEffects' && val != null && val !== 'none'
            ) || customList.some(([_, val]) => val != null && val !== 'none');

            return (
              <Card key={effect.id} className="overflow-hidden rounded-[20px] border-[#E5E7EB] bg-white shadow-xs hover:border-amber-200 transition-all">
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-[16px] bg-amber-50 flex items-center justify-center text-caution">
                        <Smile className="w-4 h-4" />
                      </div>
                      <h3 className="font-semibold text-[#111827] text-base">{format(new Date(effect.date), 'EEEE, MMM d, yyyy')}</h3>
                    </div>
                  </div>
                  
                  {hasSymptoms ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <SymptomChip label="Hunger" severity={effect.hunger} />
                      <SymptomChip label="Food Noise" severity={effect.foodNoise} />
                      <SymptomChip label="Cravings" severity={effect.cravings} />
                      <SymptomChip label="Nausea" severity={effect.nausea} />
                      <SymptomChip label="Fatigue" severity={effect.fatigue} />
                      <SymptomChip label="Constipation" severity={effect.constipation} />
                      <SymptomChip label="Diarrhea" severity={effect.diarrhea} />
                      <SymptomChip label="Reflux" severity={effect.reflux} />
                      <SymptomChip label="Appetite Loss" severity={effect.appetiteLoss} />
                      {customList.map(([name, sev]) => (
                        <SymptomChip key={name} label={name} severity={sev} />
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-subtle text-xs font-medium">
                      <Activity className="w-4 h-4" />
                      <span>No positive symptom ratings recorded in this log. Unanswered symptoms are not recorded.</span>
                    </div>
                  )}
                  
                  {effect.notes && (
                    <p className="text-xs text-muted bg-[#F8F9FC] p-3 rounded-[16px] border border-[#E5E7EB] italic">
                      "{effect.notes}"
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <LogEffectsModal 
        isOpen={isLogEffectsOpen} 
        onClose={() => setIsLogEffectsOpen(false)} 
      />
    </div>
  );
}

