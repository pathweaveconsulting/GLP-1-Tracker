import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/card';
import { format } from 'date-fns';
import { Syringe, Plus, Filter, Trash2, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { LogDoseModal } from '../components/modals/LogDoseModal';

export function Doses() {
  const { doses, deleteDose } = useStore();
  const [isLogDoseOpen, setIsLogDoseOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const sortedDoses = [...doses].sort((a, b) => {
    const tA = new Date(a.date).getTime();
    const tB = new Date(b.date).getTime();
    return sortOrder === 'desc' ? tB - tA : tA - tB;
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">Medication</h1>
          <p className="text-sm text-muted mt-0.5">Track injections with exact timestamps, sites, and dosages</p>
        </div>
        <Button onClick={() => setIsLogDoseOpen(true)} className="gap-2 bg-[#6D4AFF] hover:bg-[#5B3FE0] text-white rounded-[14px] shadow-xs px-4 py-2.5 text-xs font-semibold">
          <Plus className="w-4 h-4" />
          Record Injection
        </Button>
      </header>

      {/* Shot Site Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['Abdomen', 'Thigh', 'Arm', 'Flank'].map((siteCategory) => {
          const count = doses.filter(d => d.site.toLowerCase().includes(siteCategory.toLowerCase())).length;
          return (
            <Card key={siteCategory} className="rounded-[20px] border-[#E5E7EB] bg-white shadow-xs">
              <CardContent className="p-4 flex flex-col justify-center items-center text-center gap-1">
                <span className="text-xs font-normal text-muted">{siteCategory}</span>
                <span className="text-2xl font-semibold tracking-tight text-[#111827]">{count} <span className="text-xs font-normal text-subtle">injections</span></span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
        <h2 className="font-semibold text-[#111827] text-base">Injections ({doses.length})</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          className="gap-2 rounded-[14px] border-[#E5E7EB] text-xs font-semibold text-[#111827]"
        >
          <Filter className="w-3.5 h-3.5" />
          {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
        </Button>
      </div>

      <div className="grid gap-3">
        {sortedDoses.map((dose, i) => (
          <Card key={dose.id} className="overflow-hidden rounded-[20px] border-[#E5E7EB] bg-white shadow-xs hover:border-purple-200 transition-all">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-[16px] bg-[#F3F0FF] flex items-center justify-center shrink-0 text-[#6D4AFF]">
                  <Syringe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#111827] text-base">{dose.amountMg} mg {dose.medication}</h3>
                  <p className="text-xs text-muted font-normal flex items-center gap-1">
                    <span>{format(new Date(dose.date), 'EEEE, MMMM do, yyyy')}</span>
                    <span className="text-subtle">@</span>
                    <span className="text-[#111827] font-semibold flex items-center gap-0.5">
                      <Clock className="w-3 h-3 text-[#6D4AFF] inline" />
                      {format(new Date(dose.date), 'h:mm a')}
                    </span>
                    <span>•</span>
                    <span className="text-[#6D4AFF] font-medium">{dose.site}</span>
                  </p>
                  {dose.notes && <p className="text-xs text-subtle mt-0.5 italic">"{dose.notes}"</p>}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-muted bg-[#F8F9FC] px-2.5 py-1 rounded-lg border border-[#E5E7EB]">
                  Injection #{sortedDoses.length - i}
                </span>
                <button
                  onClick={() => deleteDose(dose.id)}
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

      <LogDoseModal 
        isOpen={isLogDoseOpen} 
        onClose={() => setIsLogDoseOpen(false)} 
      />
    </div>
  );
}
