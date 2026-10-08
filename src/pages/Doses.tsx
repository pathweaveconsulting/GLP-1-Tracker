import { useState } from 'react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { Syringe, Plus, ArrowDownUp, Trash2 } from 'lucide-react';
import { buttonClass, EmptyState, PageHeader, Panel, Stat } from '../components/ds';
import { Button } from '../components/ui/button';
import { LogDoseModal } from '../components/modals/LogDoseModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import type { DoseEvent } from '../types';
import { MedicationLevelChart } from '../components/MedicationLevelChart';
import { PkInfoModal } from '../components/PkInfoModal';

export function Doses() {
  const { doses, deleteDose, restoreDose } = useStore();
  const { show } = useToast();
  const [deleting, setDeleting] = useState<DoseEvent>();
  const [deleted, setDeleted] = useState<{entry:DoseEvent;index:number}>();
  const [isLogDoseOpen, setIsLogDoseOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showLevelInfo, setShowLevelInfo] = useState(false);

  const sortedDoses = [...doses].sort((a, b) => {
    const tA = new Date(a.date).getTime();
    const tB = new Date(b.date).getTime();
    return sortOrder === 'desc' ? tB - tA : tA - tB;
  });

  const siteCounts = ['Abdomen', 'Thigh', 'Arm', 'Flank'].map((siteCategory) => ({
    siteCategory,
    count: doses.filter(d => d.site.toLowerCase().includes(siteCategory.toLowerCase())).length,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Medication"
        description="Every injection with its time, amount and site."
        actions={<button type="button" onClick={() => setIsLogDoseOpen(true)} className={buttonClass('primary')}><Plus className="h-4 w-4" aria-hidden="true" />Record injection</button>}
      />

      {/* Estimated medication level (moved here from the home screen in the redesign) */}
      <MedicationLevelChart onOpenSources={() => setShowLevelInfo(true)} />
      <PkInfoModal open={showLevelInfo} onClose={() => setShowLevelInfo(false)} />

      <Panel title="Injection sites" description="How many recorded injections used each body area. Rotating sites can reduce irritation.">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-4">
          {siteCounts.map(({ siteCategory, count }) => (
            <Stat key={siteCategory} label={siteCategory} value={count} unit={count === 1 ? 'injection' : 'injections'} />
          ))}
        </dl>
      </Panel>

      <Panel
        title={`Injections (${doses.length})`}
        action={doses.length > 1 ? (
          <button type="button" onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')} className={buttonClass('secondary', 'sm')}>
            <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
            {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
          </button>
        ) : undefined}
      >
        {sortedDoses.length === 0 ? (
          <EmptyState title="No injections recorded yet">
            Use Record injection to add one. Your injections, sites and estimated level will appear here.
          </EmptyState>
        ) : (
        <ul className="-my-1 divide-y divide-line">
          {sortedDoses.map((dose, i) => (
            <li key={dose.id} className="flex items-start justify-between gap-3 py-3">
              <div className="flex min-w-0 items-start gap-3">
                <Syringe className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold text-ink">{dose.amountMg} mg {dose.medication}</h3>
                  <p className="text-sm text-muted">
                    {format(new Date(dose.date), 'EEE d MMM yyyy')} at {format(new Date(dose.date), 'h:mm a')} · {dose.site}
                  </p>
                  {dose.notes && <p className="mt-1 text-sm text-ink-2">Note: {dose.notes}</p>}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <span className="hidden text-[13px] text-muted sm:inline">
                  Injection #{sortOrder === 'desc' ? sortedDoses.length - i : i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setDeleting(dose)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] text-muted hover:bg-danger-soft hover:text-danger"
                  aria-label={`Delete ${dose.amountMg} mg injection from ${format(new Date(dose.date), 'MMM d, yyyy')}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
        )}
      </Panel>

      {deleted && <div role="status" className="flex flex-wrap items-center gap-3 text-sm text-muted">Injection log removed. <Button onClick={() => { if (restoreDose(deleted.entry,deleted.index)) setDeleted(undefined); else show('Could not undo: a record with this ID already exists. It was kept unchanged.'); }}>Undo last deletion</Button></div>}
      <ConfirmDialog open={!!deleting} title="Delete injection log?" description={deleting && <>Remove the recorded {deleting.amountMg} mg {deleting.medication} injection from {format(new Date(deleting.date),'MMM d, yyyy h:mm a')}? You can undo the last deletion while this page remains open.</>} confirmLabel="Delete injection log" destructive onCancel={() => setDeleting(undefined)} onConfirm={() => {
        if (deleting) {
          const index = useStore.getState().doses.findIndex(d => d.id === deleting.id);
          const current = useStore.getState().doses[index];
          if (!current || JSON.stringify(current) !== JSON.stringify(deleting)) show('This record changed. Review it again before deleting.');
          else { deleteDose(current.id); setDeleted({entry:current,index}); }
        }
        setDeleting(undefined);
      }}/>
      <LogDoseModal 
        isOpen={isLogDoseOpen} 
        onClose={() => setIsLogDoseOpen(false)} 
      />
    </div>
  );
}
