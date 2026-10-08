import { useState } from 'react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { Download, Trash2 } from 'lucide-react';
import { formatWeight, getWeightUnit } from '../lib/units';
import { sortByDate } from '../lib/insights';
import { exportTidyCsv } from '../lib/dataTransfer';
import { severityLabel } from '../lib/symptoms';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { buttonClass, EmptyState, PageHeader, Panel, Segmented } from '../components/ds';
import type { DoseEvent, WeightEntry } from '../types';

type Pending = { kind: 'dose'; entry: DoseEvent } | { kind: 'weight'; entry: WeightEntry };
type Removed = { kind: 'dose'; entry: DoseEvent; index: number } | { kind: 'weight'; entry: WeightEntry; index: number };

const th = 'px-4 py-2.5 font-semibold sm:px-5';
const td = 'px-4 py-3 sm:px-5';
const deleteBtn = 'inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] text-muted hover:bg-danger-soft hover:text-danger';

export function AllLogs() {
  const { effects, weights, doses, deleteDose, deleteWeight, restoreDose, restoreWeight, settings } = useStore();
  const { show } = useToast();
  const unit = getWeightUnit(settings);
  const [activeTab, setActiveTab] = useState<'doses' | 'weights' | 'effects'>('doses');
  const [pending, setPending] = useState<Pending>();
  const [removed, setRemoved] = useState<Removed>();

  const sortedWeights = sortByDate(weights, 'desc');
  const sortedEffects = sortByDate(effects, 'desc');
  const sortedDoses = sortByDate(doses, 'desc');

  const handleExportCSV = () => exportTidyCsv({ settings, doses, weights, effects }, unit);

  // Same safeguards as the Medication and Progress pages: confirm first, refuse a record that changed meanwhile,
  // and keep the exact removed record and its position so the last deletion can be undone.
  const confirmDelete = () => {
    if (pending) {
      const list: Array<DoseEvent | WeightEntry> = pending.kind === 'dose' ? useStore.getState().doses : useStore.getState().weights;
      const index = list.findIndex((r) => r.id === pending.entry.id);
      const current = list[index];
      if (!current || JSON.stringify(current) !== JSON.stringify(pending.entry)) show('This record changed. Review it again before deleting.');
      else if (pending.kind === 'dose') { deleteDose(current.id); setRemoved({ kind: 'dose', entry: current as DoseEvent, index }); }
      else { deleteWeight(current.id); setRemoved({ kind: 'weight', entry: current as WeightEntry, index }); }
    }
    setPending(undefined);
  };
  const undo = () => {
    if (!removed) return;
    const ok = removed.kind === 'dose' ? restoreDose(removed.entry, removed.index) : restoreWeight(removed.entry, removed.index);
    if (ok) setRemoved(undefined);
    else show('Could not undo: a record with this ID already exists. It was kept unchanged.');
  };

  const rows = activeTab === 'doses' ? sortedDoses.length : activeTab === 'weights' ? sortedWeights.length : sortedEffects.length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="All history"
        description="Every injection, weigh-in and check-in you have recorded."
        actions={<button type="button" onClick={handleExportCSV} aria-describedby="logs-csv-privacy" className={buttonClass('secondary')}>
          <Download className="h-4 w-4" aria-hidden="true" />
          CSV Export
        </button>}
      />
      <p id="logs-csv-privacy" className="-mt-3 text-[13px] text-muted">CSV files are unencrypted and contain private health records. Store them privately; use Settings for an encrypted backup.</p>

      <Segmented
        label="Record type"
        value={activeTab}
        onChange={setActiveTab}
        options={[
          { value: 'doses', label: `Shots (${doses.length})` },
          { value: 'weights', label: `Weight (${weights.length})` },
          { value: 'effects', label: `Effects (${effects.length})` },
        ]}
      />

      {removed && (
        <div role="status" className="flex flex-wrap items-center gap-3 text-sm text-muted">
          {removed.kind === 'dose' ? 'Injection log removed.' : 'Weight entry removed.'}
          <button type="button" onClick={undo} className={buttonClass('secondary', 'sm')}>Undo last deletion</button>
        </div>
      )}

      <Panel bodyClassName="p-0 sm:p-0">
        {rows === 0 ? (
          <div className="p-4 sm:p-5"><EmptyState title="Nothing recorded here yet" /></div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-sunken text-[13px] text-ink-2">
              {activeTab === 'doses' ? (
                <tr>
                  <th scope="col" className={th}>Date</th>
                  <th scope="col" className={th}>Medication</th>
                  <th scope="col" className={th}>Dose</th>
                  <th scope="col" className={th}>Injection Site</th>
                  <th scope="col" className={`${th} text-right`}><span className="sr-only">Actions</span></th>
                </tr>
              ) : activeTab === 'weights' ? (
                <tr>
                  <th scope="col" className={th}>Date</th>
                  <th scope="col" className={th}>Weight ({unit})</th>
                  <th scope="col" className={`${th} text-right`}><span className="sr-only">Actions</span></th>
                </tr>
              ) : (
                <tr>
                  <th scope="col" className={th}>Date</th>
                  <th scope="col" className={th}>Hunger</th>
                  <th scope="col" className={th}>Fatigue</th>
                  <th scope="col" className={th}>Nausea</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-line">
              {activeTab === 'doses' ? (
                sortedDoses.map(d => (
                  <tr key={d.id}>
                    <td className={`${td} whitespace-nowrap font-medium text-ink`}>{format(new Date(d.date), 'MMM d, yyyy')}</td>
                    <td className={`${td} text-ink-2`}>{d.medication}</td>
                    <td className={`${td} font-semibold tabular-nums text-ink`}>{d.amountMg} mg</td>
                    <td className={`${td} text-ink-2`}>{d.site}</td>
                    <td className="px-2 py-1 text-right sm:px-3">
                      <button type="button" onClick={() => setPending({ kind: 'dose', entry: d })} aria-label={`Delete ${d.amountMg} mg dose from ${format(new Date(d.date), 'MMM d, yyyy')}`} className={deleteBtn}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : activeTab === 'weights' ? (
                sortedWeights.map(w => (
                  <tr key={w.id}>
                    <td className={`${td} whitespace-nowrap font-medium text-ink`}>{format(new Date(w.date), 'MMM d, yyyy')}</td>
                    <td className={`${td} font-semibold tabular-nums text-ink`}>{formatWeight(w.weightLbs, unit)}</td>
                    <td className="px-2 py-1 text-right sm:px-3">
                      <button type="button" onClick={() => setPending({ kind: 'weight', entry: w })} aria-label={`Delete weight entry from ${format(new Date(w.date), 'MMM d, yyyy')}`} className={deleteBtn}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                sortedEffects.map(e => (
                  <tr key={e.id}>
                    <td className={`${td} whitespace-nowrap font-medium text-ink`}>{format(new Date(e.date), 'MMM d, yyyy')}</td>
                    {[e.hunger, e.fatigue, e.nausea].map((v, i) => (
                      <td key={i} className={`${td} ${v ? 'text-ink-2' : 'text-muted'}`}>{v ? severityLabel(v) : 'Not recorded'}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}
      </Panel>

      <ConfirmDialog
        open={!!pending}
        title={pending?.kind === 'weight' ? 'Delete weight entry?' : 'Delete injection log?'}
        description={pending && (pending.kind === 'dose'
          ? <>Remove the recorded {pending.entry.amountMg} mg {pending.entry.medication} injection from {format(new Date(pending.entry.date), 'MMM d, yyyy h:mm a')}? You can undo the last deletion while this page remains open.</>
          : <>Remove {formatWeight(pending.entry.weightLbs, unit)} from {format(new Date(pending.entry.date), 'MMM d, yyyy h:mm a')}? You can undo the last deletion while this page remains open.</>)}
        confirmLabel={pending?.kind === 'weight' ? 'Delete weight entry' : 'Delete injection log'}
        destructive
        onCancel={() => setPending(undefined)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
