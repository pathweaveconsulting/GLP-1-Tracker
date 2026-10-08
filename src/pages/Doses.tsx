import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/card';
import { format } from 'date-fns';
import { Syringe, Plus, Filter, Trash2, Clock } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Medication</h1>
          <p className="text-sm text-muted mt-0.5">Track injections with exact timestamps, sites, and dosages</p>
        </div>
        <Button onClick={() => setIsLogDoseOpen(true)} className="gap-2 bg-brand hover:bg-brand-strong text-white rounded-[14px] shadow-xs px-4 py-2.5 text-xs font-semibold">
          <Plus className="w-4 h-4" />
          Record Injection
        </Button>
      </header>

      {/* Estimated medication level (moved here from the home screen in the redesign) */}
      <MedicationLevelChart onOpenSources={() => setShowLevelInfo(true)} />
      <PkInfoModal open={showLevelInfo} onClose={() => setShowLevelInfo(false)} />

      {/* Shot Site Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['Abdomen', 'Thigh', 'Arm', 'Flank'].map((siteCategory) => {
          const count = doses.filter(d => d.site.toLowerCase().includes(siteCategory.toLowerCase())).length;
          return (
            <Card key={siteCategory} className="rounded-[20px] border-line bg-white shadow-xs">
              <CardContent className="p-4 flex flex-col justify-center items-center text-center gap-1">
                <span className="text-xs font-normal text-muted">{siteCategory}</span>
                <span className="text-2xl font-semibold tracking-tight text-ink">{count} <span className="text-xs font-normal text-subtle">injections</span></span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-b border-sunken pb-4">
        <h2 className="font-semibold text-ink text-base">Injections ({doses.length})</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          className="gap-2 rounded-[14px] border-line text-xs font-semibold text-ink"
        >
          <Filter className="w-3.5 h-3.5" />
          {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
        </Button>
      </div>

      <div className="grid gap-3">
        {sortedDoses.map((dose, i) => (
          <Card key={dose.id} className="overflow-hidden rounded-[20px] border-line bg-white shadow-xs hover:border-[#bcd1ec] transition-all">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-[16px] bg-brand-soft flex items-center justify-center shrink-0 text-brand">
                  <Syringe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-ink text-base">{dose.amountMg} mg {dose.medication}</h3>
                  <p className="text-xs text-muted font-normal flex items-center gap-1">
                    <span>{format(new Date(dose.date), 'EEEE, MMMM do, yyyy')}</span>
                    <span className="text-subtle">@</span>
                    <span className="text-ink font-semibold flex items-center gap-0.5">
                      <Clock className="w-3 h-3 text-brand inline" />
                      {format(new Date(dose.date), 'h:mm a')}
                    </span>
                    <span>•</span>
                    <span className="text-brand font-medium">{dose.site}</span>
                  </p>
                  {dose.notes && <p className="text-xs text-subtle mt-0.5 italic">"{dose.notes}"</p>}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-muted bg-canvas px-2.5 py-1 rounded-lg border border-line">
                  Injection #{sortedDoses.length - i}
                </span>
                <button
                  onClick={() => setDeleting(dose)}
                  className="p-2 rounded-[16px] text-subtle hover:text-danger hover:bg-red-50 transition-colors cursor-pointer"
                  aria-label={`Delete ${dose.amountMg} mg injection from ${format(new Date(dose.date), 'MMM d, yyyy')}`}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {deleted && <div role="status" className="text-sm text-muted">Injection log removed. <Button onClick={() => { if (restoreDose(deleted.entry,deleted.index)) setDeleted(undefined); else show('Could not undo: a record with this ID already exists. It was kept unchanged.'); }}>Undo last deletion</Button></div>}
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
