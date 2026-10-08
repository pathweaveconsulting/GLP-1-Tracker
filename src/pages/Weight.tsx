import React, { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/button';
import { WeightLossProgressChart } from '../components/WeightLossProgressChart';
import { WeightInjectionsChart } from '../components/WeightInjectionsChart';
import { format } from 'date-fns';
import { TrendingDown, TrendingUp, Plus, Upload, Trash2 } from 'lucide-react';
import { buttonClass, EmptyState, noteClass, PageHeader, Panel, Segmented, Stat } from '../components/ds';
import { LogWeightModal } from '../components/modals/LogWeightModal';
import { WeightJourneyDashboard } from '../components/WeightJourneyDashboard';
import { formatWeight, formatWeightChange, getWeightUnit } from '../lib/units';
import { sortByDate } from '../lib/insights';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { readFileAsText } from '../lib/dataTransfer';
import { importWeightsCsv, MAX_IMPORT_BYTES, WeightImportResult } from '../lib/weightImport';
import type { WeightEntry } from '../types';

export function Weight() {
  const { weights, deleteWeight, restoreWeight, settings, addWeights } = useStore();
  const [deleting, setDeleting] = useState<WeightEntry>();
  const [deleted, setDeleted] = useState<{entry:WeightEntry;index:number}>();
  const { show: showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<WeightImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'journey' | 'table'>('journey');
  const [isLogWeightOpen, setIsLogWeightOpen] = useState(false);
  
  const unit = getWeightUnit(settings);
  const sortedWeights = sortByDate(weights, 'desc');

  const latestWeight = sortedWeights.length > 0 ? sortedWeights[0].weightLbs : null;
  const startLbs = settings.startingWeight > 0 ? settings.startingWeight : null;
  const change = latestWeight != null && startLbs != null ? latestWeight - startLbs : null;
  const percentChange = change != null && startLbs ? (change / startLbs) * 100 : null;
  const goalRemaining = latestWeight != null && settings.targetWeight > 0 ? Math.max(0, latestWeight - settings.targetWeight) : null;

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError(null);
    if (file.size > MAX_IMPORT_BYTES) {
      setImportError('This file is too large to import (the limit is 5 MB). Split it into smaller files.');
      return;
    }
    const result = importWeightsCsv(await readFileAsText(file), { existing: weights, defaultUnit: unit });
    if (result.errors.length > 0) setImportError(result.errors[0]);
    else if (result.rows.length === 0) setImportError(`Nothing to import: ${result.duplicates} already in your log, ${result.skipped} rows were invalid or future-dated.`);
    else setPendingImport(result);
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    addWeights(pendingImport.rows);
    showToast(`Imported ${pendingImport.rows.length} ${pendingImport.rows.length === 1 ? 'weight' : 'weights'}.`);
    setPendingImport(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Progress"
        description={settings.targetWeight > 0 ? `Goal weight: ${formatWeight(settings.targetWeight, unit)}` : 'No goal weight set yet'}
        actions={<>
          <button type="button" aria-label="Import weights from CSV" onClick={() => fileRef.current?.click()} className={buttonClass('secondary')}>
            <Upload className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline" aria-hidden="true">Import CSV</span>
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" aria-label="Choose a CSV file of weights" className="sr-only" tabIndex={-1} onChange={handleImportFile} />
          <button type="button" onClick={() => setIsLogWeightOpen(true)} className={buttonClass('primary')}>
            <Plus className="h-4 w-4" aria-hidden="true" />Record weight
          </button>
        </>}
      />

      <Segmented
        label="Progress view"
        value={activeTab}
        onChange={setActiveTab}
        options={[{ value: 'journey', label: 'Journey' }, { value: 'table', label: 'Weight Log & Table' }]}
      />

      {importError && (
        <div role="alert" className={noteClass('danger', 'flex items-start justify-between gap-3 text-sm')}>
          <span>{importError}</span>
          <button type="button" onClick={() => setImportError(null)} className="shrink-0 font-semibold underline">Dismiss</button>
        </div>
      )}

      {activeTab === 'journey' ? (
        <WeightJourneyDashboard />
      ) : (
        <>
          <Panel title="Summary">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5 md:grid-cols-4">
              <Stat label="Current weight" value={formatWeight(latestWeight, unit, { unit: false })} unit={latestWeight != null ? unit : undefined} />
              <Stat label="Change since start" value={formatWeightChange(change, unit, { unit: false })} unit={change != null ? unit : undefined} />
              <Stat label="Change since start (%)" value={percentChange == null ? '–' : `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}`} unit={percentChange != null ? '%' : undefined} />
              <Stat label="To goal" value={formatWeight(goalRemaining, unit, { unit: false })} unit={goalRemaining != null ? unit : undefined} />
            </dl>
          </Panel>

          <WeightLossProgressChart />
          <WeightInjectionsChart />

          <Panel title={`Weigh-ins (${sortedWeights.length})`} description="Newest first. Change is compared with the weigh-in before it." bodyClassName="px-0 pb-0 sm:px-0 sm:pb-0">
            {sortedWeights.length === 0 ? (
              <div className="px-4 pb-4 sm:px-5 sm:pb-5"><EmptyState title="No weigh-ins yet">Record a weight or import a CSV file to build your history.</EmptyState></div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-y border-line bg-sunken text-[13px] text-ink-2">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-semibold sm:px-5">Date</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold sm:px-5">Weight</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold sm:px-5">Change</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold sm:px-5"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sortedWeights.map((w, index) => {
                    const prevWeight = index < sortedWeights.length - 1 ? sortedWeights[index + 1].weightLbs : w.weightLbs;
                    const delta = w.weightLbs - prevWeight;
                    const isLoss = delta < 0;

                    return (
                      <tr key={w.id}>
                        <td className="whitespace-nowrap px-4 py-3 text-ink sm:px-5">{format(new Date(w.date), 'EEE d MMM yyyy')}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums text-ink sm:px-5">{formatWeight(w.weightLbs, unit)}</td>
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink-2 sm:px-5">
                          {Math.abs(delta) > 0.0001 ? (
                            <span className="inline-flex items-center gap-1">
                              {isLoss ? <TrendingDown className="h-4 w-4" aria-hidden="true" /> : <TrendingUp className="h-4 w-4" aria-hidden="true" />}
                              <span className="sr-only">{isLoss ? 'Down' : 'Up'} </span>{formatWeight(Math.abs(delta), unit)}
                            </span>
                          ) : (
                            <span className="text-muted">No change</span>
                          )}
                        </td>
                        <td className="px-2 py-1 text-right sm:px-3">
                          <button
                            type="button"
                            onClick={() => setDeleting(w)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] text-muted hover:bg-danger-soft hover:text-danger"
                            aria-label={`Delete weight entry from ${format(new Date(w.date), 'MMM d, yyyy')}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </Panel>
        </>
      )}

      {deleted && <div role="status" className="flex flex-wrap items-center gap-3 text-sm text-muted">Weight entry removed. <Button onClick={() => { if (restoreWeight(deleted.entry,deleted.index)) setDeleted(undefined); else showToast('Could not undo: a record with this ID already exists. It was kept unchanged.'); }}>Undo last deletion</Button></div>}
      <ConfirmDialog open={!!deleting} title="Delete weight entry?" description={deleting && <>Remove {formatWeight(deleting.weightLbs,unit)} from {format(new Date(deleting.date),'MMM d, yyyy h:mm a')}? You can undo the last deletion while this page remains open.</>} confirmLabel="Delete weight entry" destructive onCancel={() => setDeleting(undefined)} onConfirm={() => {
        if (deleting) {
          const index = useStore.getState().weights.findIndex(w => w.id === deleting.id);
          const current = useStore.getState().weights[index];
          if (!current || JSON.stringify(current) !== JSON.stringify(deleting)) showToast('This record changed. Review it again before deleting.');
          else { deleteWeight(current.id); setDeleted({entry:current,index}); }
        }
        setDeleting(undefined);
      }}/>
      <ConfirmDialog
        open={!!pendingImport}
        title={pendingImport ? `Import ${pendingImport.rows.length} ${pendingImport.rows.length === 1 ? 'weight' : 'weights'}?` : ''}
        description={
          pendingImport && (
            <>
              <p>
                {pendingImport.unitSource === 'default' ? (
                  <>No unit in the file; assuming <strong>{pendingImport.unit}</strong>, your current unit. Cancel and add a unit to the header if that is wrong.</>
                ) : (
                  <>Read as <strong>{pendingImport.unit}</strong> ({{ header: 'from the column header', column: 'from the unit in the file', values: 'guessed from the values, so please check' }[pendingImport.unitSource]}).</>
                )}
              </p>
              <p className="mt-1">
                {pendingImport.duplicates} already in your log and {pendingImport.skipped} invalid or future-dated {pendingImport.skipped === 1 ? 'row' : 'rows'} will be skipped.
              </p>
            </>
          )
        }
        confirmLabel="Import"
        onConfirm={confirmImport}
        onCancel={() => setPendingImport(null)}
      />

      <LogWeightModal 
        isOpen={isLogWeightOpen} 
        onClose={() => setIsLogWeightOpen(false)} 
      />
    </div>
  );
}
