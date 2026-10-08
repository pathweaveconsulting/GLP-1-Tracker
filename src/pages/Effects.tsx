import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { format } from 'date-fns';
import { Plus, Activity, Smile, Sparkles, ListFilter } from 'lucide-react';
import { EffectEntry, Severity } from '../types';
import { LogEffectsModal } from '../components/modals/LogEffectsModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { COLLECTED_FIELDS, OPTIONAL_FIELDS } from '../lib/symptoms';
import { SideEffectsAnalyticsDashboard } from '../components/SideEffectsAnalyticsDashboard';

const severityColorMap: Record<Severity, string> = {
  none: 'bg-sunken text-muted',
  mild: 'bg-amber-100 text-amber-800',
  moderate: 'bg-orange-100 text-orange-800',
  severe: 'bg-rose-100 text-rose-800'
};

const SymptomChip = ({ label, severity }: { label: string; severity: Severity | undefined; key?: string }) => {
  if (!severity) return null;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${severityColorMap[severity]}`}>
      {label}: {severity}
    </span>
  );
};

export function Effects() {
  const { effects, deleteEffect, restoreEffect } = useStore();
  const [editing, setEditing] = useState<EffectEntry>();
  const [deleting, setDeleting] = useState<EffectEntry>();
  const [deleted, setDeleted] = useState<EffectEntry>();
  const [activeTab, setActiveTab] = useState<'analytics' | 'log'>('analytics');
  const [isLogEffectsOpen, setIsLogEffectsOpen] = useState(false);
  
  const sortedEffects = [...effects].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Side Effects</h1>
          <p className="text-muted text-sm mt-0.5">Track body adaptation, side effect trends, and daily logs</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View Tab Selector */}
          <div className="flex bg-canvas p-1 rounded-[14px] border border-line shadow-xs">
            <button
              aria-pressed={activeTab === 'analytics'}
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-[10px] transition-all ${
                activeTab === 'analytics'
                  ? 'bg-white text-ink shadow-xs'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              <span>Analytics Dashboard</span>
            </button>
            <button
              aria-pressed={activeTab === 'log'}
              onClick={() => setActiveTab('log')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-[10px] transition-all ${
                activeTab === 'log'
                  ? 'bg-white text-ink shadow-xs'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5 text-muted" />
              <span>Symptom Log History</span>
            </button>
          </div>

          <Button onClick={() => { setEditing(undefined); setIsLogEffectsOpen(true); }} className="gap-2 bg-amber-700 hover:bg-amber-800 text-white rounded-[14px] shadow-xs px-4 py-2.5 text-xs font-semibold">
            <Plus className="w-4 h-4" />
            <span>Record Symptoms</span>
          </Button>
        </div>
      </header>

      {activeTab === 'analytics' ? (
        <SideEffectsAnalyticsDashboard />
      ) : (
        <div className="grid gap-4">
          {sortedEffects.length === 0 && <p className="text-sm text-muted">No symptom logs yet. Unanswered symptoms are not recorded.</p>}
          {sortedEffects.map((effect) => {
            const customList = effect.customEffects ? Object.entries(effect.customEffects) : [];
            const hasSymptoms = Object.entries(effect).some(([key, val]) => 
              key !== 'id' && key !== 'date' && key !== 'notes' && key !== 'customEffects' && val != null
            ) || customList.some(([_, val]) => val != null);

            return (
              <Card key={effect.id} className="overflow-hidden rounded-[20px] border-line bg-white shadow-xs hover:border-amber-200 transition-all">
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-[16px] bg-amber-50 flex items-center justify-center text-caution">
                        <Smile className="w-4 h-4" />
                      </div>
                      <h3 className="font-semibold text-ink text-base">{format(new Date(effect.date), 'EEEE, MMM d, yyyy')}</h3>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={() => { setEditing(effect); setIsLogEffectsOpen(true); }} aria-label={`Edit symptom log ${format(new Date(effect.date), 'yyyy-MM-dd')}`}>Edit</Button>
                    <Button onClick={() => setDeleting(effect)} aria-label={`Delete symptom log ${format(new Date(effect.date), 'yyyy-MM-dd')}`}>Delete</Button>
                  </div>
                  {hasSymptoms ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {[...COLLECTED_FIELDS, ...OPTIONAL_FIELDS].map(({key, label}) => (
                        <SymptomChip key={key} label={label} severity={effect[key]} />
                      ))}
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
                    <p className="text-xs text-muted bg-canvas p-3 rounded-[16px] border border-line italic">
                      "{effect.notes}"
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {deleted && <div role="status" className="text-sm text-muted">Symptom log removed. <Button onClick={() => { restoreEffect(deleted); setDeleted(undefined); }}>Undo last deletion</Button></div>}
      <ConfirmDialog open={!!deleting} title="Delete symptom log?" description="This removes the selected symptom ratings and notes. You can undo the last deletion while this page remains open." confirmLabel="Delete log" destructive onCancel={() => setDeleting(undefined)} onConfirm={() => { if (deleting) { const current = useStore.getState().effects.find((e) => e.id === deleting.id); if (current) { deleteEffect(current.id); setDeleted(current); } } setDeleting(undefined); }} />
      <LogEffectsModal 
        effect={editing}
        isOpen={isLogEffectsOpen} 
        onClose={() => setIsLogEffectsOpen(false)} 
      />
    </div>
  );
}

