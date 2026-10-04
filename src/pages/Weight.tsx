import React, { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { WeightLossProgressChart } from '../components/WeightLossProgressChart';
import { format } from 'date-fns';
import { Scale, TrendingDown, TrendingUp, Plus, Upload, Trash2, Sparkles, ListFilter, Compass } from 'lucide-react';
import { LogWeightModal } from '../components/modals/LogWeightModal';
import { WeightJourneyDashboard } from '../components/WeightJourneyDashboard';
import { formatWeight, formatWeightChange, getWeightUnit } from '../lib/units';
import { sortByDate } from '../lib/insights';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { readFileAsText } from '../lib/dataTransfer';
import { importWeightsCsv, MAX_IMPORT_BYTES, WeightImportResult } from '../lib/weightImport';

export function Weight() {
  const { weights, deleteWeight, settings, addWeights } = useStore();
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
    else if (result.rows.length === 0) setImportError(`Nothing to import: ${result.duplicates} already in your log, ${result.skipped} rows couldn’t be read.`);
    else setPendingImport(result);
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    addWeights(pendingImport.rows);
    showToast(`Imported ${pendingImport.rows.length} ${pendingImport.rows.length === 1 ? 'weight' : 'weights'}.`);
    setPendingImport(null);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">Weight Journey</h1>
          <p className="text-muted text-sm mt-0.5">{settings.targetWeight > 0 ? `Goal weight: ${formatWeight(settings.targetWeight, unit)}` : 'No goal weight set yet'}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View Tab Selector */}
          <div className="flex bg-[#F8F9FC] p-1 rounded-[14px] border border-[#E5E7EB] shadow-xs">
            <button
              aria-pressed={activeTab === 'journey'}
              onClick={() => setActiveTab('journey')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-[10px] transition-all ${
                activeTab === 'journey'
                  ? 'bg-white text-[#111827] shadow-xs'
                  : 'text-muted hover:text-[#111827]'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-[#6D4AFF]" />
              <span>Weight Journey Dashboard</span>
            </button>
            <button
              aria-pressed={activeTab === 'table'}
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-[10px] transition-all ${
                activeTab === 'table'
                  ? 'bg-white text-[#111827] shadow-xs'
                  : 'text-muted hover:text-[#111827]'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5 text-muted" />
              <span>Weight Log & Table</span>
            </button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="icon" aria-label="Import weights from CSV" onClick={() => fileRef.current?.click()} className="rounded-[14px] border-[#E5E7EB]">
              <Upload className="w-4 h-4 text-muted" aria-hidden="true" />
            </Button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" aria-label="Choose a CSV file of weights" className="sr-only" tabIndex={-1} onChange={handleImportFile} />
            <Button onClick={() => setIsLogWeightOpen(true)} className="gap-2 bg-[#15803D] hover:bg-[#166534] text-white rounded-[14px] shadow-xs px-4 py-2.5 text-xs font-semibold">
              <Plus className="w-4 h-4" />
              <span>Record Weight</span>
            </Button>
          </div>
        </div>
      </header>

      {importError && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900">
          <span>{importError}</span>
          <button type="button" onClick={() => setImportError(null)} className="font-semibold underline shrink-0">Dismiss</button>
        </div>
      )}

      {activeTab === 'journey' ? (
        <WeightJourneyDashboard />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="rounded-[16px] border-[#E5E7EB] shadow-xs">
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted mb-1">Current Weight</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tighter text-[#111827]">{formatWeight(latestWeight, unit, { unit: false })}</span>
                  <span className="text-xs font-semibold text-muted">{unit}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="rounded-[16px] border-[#E5E7EB] shadow-xs">
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted mb-1">Change since start</span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-3xl font-semibold tracking-tighter ${change != null && change < 0 ? 'text-positive' : 'text-[#111827]'}`}>{formatWeightChange(change, unit, { unit: false })}</span>
                  <span className="text-xs font-semibold text-muted">{unit}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[16px] border-[#E5E7EB] shadow-xs">
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted mb-1">% Change</span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-3xl font-semibold tracking-tighter ${percentChange != null && percentChange < 0 ? 'text-positive' : 'text-[#111827]'}`}>{percentChange == null ? '–' : `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}`}</span>
                  <span className="text-xs font-semibold text-muted">%</span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[16px] border-[#E5E7EB] shadow-xs">
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted mb-1">To Goal</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tighter text-[#111827]">{formatWeight(goalRemaining, unit, { unit: false })}</span>
                  <span className="text-xs font-semibold text-muted">{unit}</span>
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
                <thead className="text-xs text-subtle bg-[#F8F9FC]/80 border-y border-[#E5E7EB]">
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
                    const delta = w.weightLbs - prevWeight;
                    const isLoss = delta < 0;
                    
                    return (
                      <tr key={w.id} className="hover:bg-[#F8F9FC]/60 transition-colors">
                        <td className="px-6 py-4 font-medium text-[#111827]">{format(new Date(w.date), 'MMM d, yyyy')}</td>
                        <td className="px-6 py-4 font-semibold text-[#111827]">{formatWeight(w.weightLbs, unit)}</td>
                        <td className="px-6 py-4 font-semibold">
                          {Math.abs(delta) > 0.0001 ? (
                            <span className={`inline-flex items-center gap-1 ${isLoss ? 'text-positive' : 'text-danger'}`}>
                              {isLoss ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                              {formatWeight(Math.abs(delta), unit)}
                            </span>
                          ) : (
                            <span className="text-subtle">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => deleteWeight(w.id)} 
                            className="text-subtle hover:text-danger p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            aria-label={`Delete weight entry from ${format(new Date(w.date), 'MMM d, yyyy')}`}
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
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

      <ConfirmDialog
        open={!!pendingImport}
        title={pendingImport ? `Import ${pendingImport.rows.length} ${pendingImport.rows.length === 1 ? 'weight' : 'weights'}?` : ''}
        description={
          pendingImport && (
            <>
              <p>
                Read as <strong>{pendingImport.unit}</strong> ({{ header: 'from the column header', column: 'from the unit in the file', values: 'guessed from the values, so please check', default: 'your current unit, since the file doesn’t say' }[pendingImport.unitSource]}).
              </p>
              <p className="mt-1">
                {pendingImport.duplicates} already in your log and {pendingImport.skipped} unreadable {pendingImport.skipped === 1 ? 'row' : 'rows'} will be skipped.
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
