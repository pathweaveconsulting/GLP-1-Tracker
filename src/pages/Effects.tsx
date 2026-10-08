import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/button';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { buttonClass, EmptyState, PageHeader, Panel, Segmented } from '../components/ds';
import type { EffectEntry, Severity } from '../types';
import { LogEffectsModal } from '../components/modals/LogEffectsModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { COLLECTED_FIELDS, OPTIONAL_FIELDS } from '../lib/symptoms';
import { SideEffectsAnalyticsDashboard } from '../components/SideEffectsAnalyticsDashboard';

const SymptomChip = ({ label, severity }: { label: string; severity: Severity | undefined; key?: string }) => {
  if (!severity) return null;
  return (
    <span className={`inline-flex items-center rounded-[8px] border px-2.5 py-1 text-[13px] ${severity === 'none' ? 'border-line text-muted' : 'border-line-strong font-semibold text-ink'}`}>
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
    <div className="space-y-5">
      <PageHeader
        title="Health"
        description="Symptoms and side effects you have recorded, and how they change over time."
        actions={<button type="button" onClick={() => { setEditing(undefined); setIsLogEffectsOpen(true); }} className={buttonClass('primary')}><Plus className="h-4 w-4" aria-hidden="true" />Record symptoms</button>}
      />

      <Segmented
        label="Health view"
        value={activeTab}
        onChange={setActiveTab}
        options={[{ value: 'analytics', label: 'Patterns' }, { value: 'log', label: 'Symptom Log History' }]}
      />

      {activeTab === 'analytics' ? (
        <SideEffectsAnalyticsDashboard />
      ) : (
        <Panel title={`Check-ins (${sortedEffects.length})`} description="Only ratings you chose are shown. Unanswered symptoms are not recorded.">
          {sortedEffects.length === 0 && <EmptyState title="No symptom logs yet">Unanswered symptoms are not recorded.</EmptyState>}
          <ul className="-my-1 divide-y divide-line">
          {sortedEffects.map((effect) => {
            const customList = effect.customEffects ? Object.entries(effect.customEffects) : [];
            const hasSymptoms = Object.entries(effect).some(([key, val]) =>
              key !== 'id' && key !== 'date' && key !== 'notes' && key !== 'customEffects' && val != null
            ) || customList.some(([_, val]) => val != null);
            const day = format(new Date(effect.date), 'yyyy-MM-dd');

            return (
              <li key={effect.id} className="space-y-2.5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[15px] font-semibold text-ink">{format(new Date(effect.date), 'EEEE d MMM yyyy')}</h3>
                  <div className="flex gap-2">
                    <button type="button" className={buttonClass('secondary', 'sm')} onClick={() => { setEditing(effect); setIsLogEffectsOpen(true); }} aria-label={`Edit symptom log ${day}`}><Pencil className="h-3.5 w-3.5" aria-hidden="true" />Edit</button>
                    <button type="button" className={buttonClass('secondary', 'sm')} onClick={() => setDeleting(effect)} aria-label={`Delete symptom log ${day}`}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Delete</button>
                  </div>
                </div>
                {hasSymptoms ? (
                  <div className="flex flex-wrap gap-1.5">
                    {[...COLLECTED_FIELDS, ...OPTIONAL_FIELDS].map(({key, label}) => (
                      <SymptomChip key={key} label={label} severity={effect[key]} />
                    ))}
                    {customList.map(([name, sev]) => (
                      <SymptomChip key={name} label={name} severity={sev} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No positive symptom ratings recorded in this log. Unanswered symptoms are not recorded.</p>
                )}
                {effect.notes && <p className="text-sm text-ink-2">Note: {effect.notes}</p>}
              </li>
            );
          })}
          </ul>
        </Panel>
      )}

      {deleted && <div role="status" className="flex flex-wrap items-center gap-3 text-sm text-muted">Symptom log removed. <Button onClick={() => { restoreEffect(deleted); setDeleted(undefined); }}>Undo last deletion</Button></div>}
      <ConfirmDialog open={!!deleting} title="Delete symptom log?" description="This removes the selected symptom ratings and notes. You can undo the last deletion while this page remains open." confirmLabel="Delete log" destructive onCancel={() => setDeleting(undefined)} onConfirm={() => { if (deleting) { const current = useStore.getState().effects.find((e) => e.id === deleting.id); if (current) { deleteEffect(current.id); setDeleted(current); } } setDeleting(undefined); }} />
      <LogEffectsModal 
        effect={editing}
        isOpen={isLogEffectsOpen} 
        onClose={() => setIsLogEffectsOpen(false)} 
      />
    </div>
  );
}

