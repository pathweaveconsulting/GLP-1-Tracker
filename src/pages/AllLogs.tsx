import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { format } from 'date-fns';
import { Download, Trash2 } from 'lucide-react';
import { formatWeight, getWeightUnit } from '../lib/units';
import { sortByDate } from '../lib/insights';
import { exportTidyCsv } from '../lib/dataTransfer';

export function AllLogs() {
  const { effects, weights, doses, deleteDose, deleteWeight, settings } = useStore();
  const unit = getWeightUnit(settings);
  const [activeTab, setActiveTab] = useState<'doses' | 'weights' | 'effects'>('doses');

  const sortedWeights = sortByDate(weights, 'desc');
  const sortedEffects = sortByDate(effects, 'desc');
  const sortedDoses = sortByDate(doses, 'desc');

  const handleExportCSV = () => exportTidyCsv({ settings, doses, weights, effects }, unit);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">All Telemetry Logs</h1>
          <p className="text-sm text-muted mt-0.5">Master database of all injections, weights, and symptoms</p>
        </div>
        <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-2 rounded-[14px] border-[#E5E7EB] text-xs font-semibold text-[#111827]">
          <Download className="w-4 h-4 text-muted" />
          CSV Export
        </Button>
      </header>

      <div className="flex gap-2 p-1 bg-[#F8F9FC] border border-[#E5E7EB] rounded-[14px]">
        <button 
          aria-pressed={activeTab === 'doses'}
          onClick={() => setActiveTab('doses')}
          className={`flex-1 py-2 text-xs font-semibold rounded-[10px] transition-all cursor-pointer ${activeTab === 'doses' ? 'bg-white shadow-xs text-[#111827]' : 'text-muted hover:text-[#111827]'}`}
        >
          Shots ({doses.length})
        </button>
        <button 
          aria-pressed={activeTab === 'weights'}
          onClick={() => setActiveTab('weights')}
          className={`flex-1 py-2 text-xs font-semibold rounded-[10px] transition-all cursor-pointer ${activeTab === 'weights' ? 'bg-white shadow-xs text-[#111827]' : 'text-muted hover:text-[#111827]'}`}
        >
          Weight ({weights.length})
        </button>
        <button 
          aria-pressed={activeTab === 'effects'}
          onClick={() => setActiveTab('effects')}
          className={`flex-1 py-2 text-xs font-semibold rounded-[10px] transition-all cursor-pointer ${activeTab === 'effects' ? 'bg-white shadow-xs text-[#111827]' : 'text-muted hover:text-[#111827]'}`}
        >
          Effects ({effects.length})
        </button>
      </div>

      <Card className="rounded-[24px] border-[#E5E7EB] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] text-muted font-semibold bg-[#F8F9FC] border-b border-[#E5E7EB]">
              {activeTab === 'doses' ? (
                <tr>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Medication</th>
                  <th className="px-6 py-3.5">Dose</th>
                  <th className="px-6 py-3.5">Injection Site</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              ) : activeTab === 'weights' ? (
                <tr>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Weight ({unit})</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Hunger</th>
                  <th className="px-6 py-3.5">Fatigue</th>
                  <th className="px-6 py-3.5">Nausea</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {activeTab === 'doses' ? (
                sortedDoses.map(d => (
                  <tr key={d.id} className="hover:bg-[#F8F9FC] transition-colors">
                    <td className="px-6 py-3.5 text-[#111827] font-semibold">{format(new Date(d.date), 'MMM d, yyyy')}</td>
                    <td className="px-6 py-3.5 text-muted font-normal">{d.medication}</td>
                    <td className="px-6 py-3.5 font-semibold text-[#6D4AFF]">{d.amountMg} mg</td>
                    <td className="px-6 py-3.5 text-muted font-normal">{d.site}</td>
                    <td className="px-6 py-3.5 text-right">
                      <button onClick={() => deleteDose(d.id)} aria-label={`Delete ${d.amountMg} mg dose from ${format(new Date(d.date), 'MMM d, yyyy')}`} className="text-subtle hover:text-danger p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer">
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : activeTab === 'weights' ? (
                sortedWeights.map(w => (
                  <tr key={w.id} className="hover:bg-[#F8F9FC] transition-colors">
                    <td className="px-6 py-3.5 text-[#111827] font-semibold">{format(new Date(w.date), 'MMM d, yyyy')}</td>
                    <td className="px-6 py-3.5 font-semibold text-positive">{formatWeight(w.weightLbs, unit)}</td>
                    <td className="px-6 py-3.5 text-right">
                      <button onClick={() => deleteWeight(w.id)} aria-label={`Delete weight entry from ${format(new Date(w.date), 'MMM d, yyyy')}`} className="text-subtle hover:text-danger p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer">
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                sortedEffects.map(e => (
                  <tr key={e.id} className="hover:bg-[#F8F9FC] transition-colors">
                    <td className="px-6 py-3.5 text-[#111827] font-semibold">{format(new Date(e.date), 'MMM d, yyyy')}</td>
                    <td className="px-6 py-3.5 capitalize text-muted font-normal">{e.hunger}</td>
                    <td className="px-6 py-3.5 capitalize text-muted font-normal">{e.fatigue}</td>
                    <td className="px-6 py-3.5 capitalize text-muted font-normal">{e.nausea}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
