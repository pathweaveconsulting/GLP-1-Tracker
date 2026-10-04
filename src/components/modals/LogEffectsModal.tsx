import React, { useState } from 'react';
import { X, Smile, Check, Plus } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Severity } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const DEFAULT_SYMPTOMS = [
  { key: 'foodNoise', label: 'Food Noise' },
  { key: 'hunger', label: 'Hunger Level' },
  { key: 'nausea', label: 'Nausea' },
  { key: 'fatigue', label: 'Fatigue' },
  { key: 'reflux', label: 'Reflux / Heartburn' },
  { key: 'constipation', label: 'Constipation' },
  { key: 'appetiteLoss', label: 'Appetite Suppression' },
];

export function LogEffectsModal({ isOpen, onClose, onSuccess }: Props) {
  const { addEffect } = useStore();
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Standard severity states
  const [severities, setSeverities] = useState<Record<string, Severity>>({
    foodNoise: 'none',
    hunger: 'none',
    nausea: 'none',
    fatigue: 'none',
    reflux: 'none',
    constipation: 'none',
    appetiteLoss: 'mild',
  });

  // Custom side effects list & severities (Requirement 1)
  const [customEffects, setCustomEffects] = useState<Array<{ name: string; level: Severity }>>([]);
  const [newEffectName, setNewEffectName] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const handleSeverityChange = (key: string, level: Severity) => {
    setSeverities((prev) => ({ ...prev, [key]: level }));
  };

  const handleCustomSeverityChange = (index: number, level: Severity) => {
    setCustomEffects((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], level };
      return next;
    });
  };

  const handleAddCustomEffect = () => {
    if (newEffectName.trim()) {
      setCustomEffects((prev) => [...prev, { name: newEffectName.trim(), level: 'mild' }]);
      setNewEffectName('');
      setIsAddingCustom(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Transform custom effects array to record
    const customRecord: Record<string, Severity> = {};
    customEffects.forEach((ce) => {
      customRecord[ce.name] = ce.level;
    });

    addEffect({
      date: new Date(date).toISOString(),
      hunger: severities.hunger || 'none',
      foodNoise: severities.foodNoise || 'none',
      cravings: 'none',
      mood: 'none',
      energy: 'none',
      nausea: severities.nausea || 'none',
      fatigue: severities.fatigue || 'none',
      constipation: severities.constipation || 'none',
      diarrhea: 'none',
      reflux: severities.reflux || 'none',
      appetiteLoss: severities.appetiteLoss || 'none',
      bloating: 'none',
      dehydration: 'none',
      indigestion: 'none',
      insomnia: 'none',
      customEffects: customRecord,
      notes,
    });

    if (onSuccess) onSuccess();
    onClose();
  };

  const renderSeveritySelector = (label: string, value: Severity, onChange: (val: Severity) => void) => (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-[#344054]">{label}</label>
      <div className="grid grid-cols-4 gap-1.5">
        {(['none', 'mild', 'moderate', 'severe'] as Severity[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`py-1.5 text-xs font-semibold rounded-lg border capitalize transition-all ${
              value === s
                ? s === 'none'
                  ? 'bg-[#E5E7EB] border-slate-400 text-[#111827]'
                  : s === 'mild'
                  ? 'bg-amber-100 border-amber-400 text-amber-900 font-semibold'
                  : s === 'moderate'
                  ? 'bg-orange-100 border-orange-400 text-orange-900 font-semibold'
                  : 'bg-rose-100 border-rose-500 text-rose-900 font-semibold'
                : 'border-[#E5E7EB] text-[#667085] hover:bg-[#F8F9FC]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-[24px] p-6 shadow-2xl border border-[#E5E7EB] relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E5E7EB] flex items-center justify-center text-[#667085] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[16px] bg-amber-50 flex items-center justify-center text-amber-600">
            <Smile className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#111827]">Log Effects & Side Effects</h2>
            <p className="text-xs text-[#667085]">Track appetite suppression & custom side effects</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold tracking-wider text-[#667085] mb-1.5">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[16px] border border-[#E5E7EB] bg-[#F8F9FC] text-[#111827] text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {DEFAULT_SYMPTOMS.map((symptom) => (
            <React.Fragment key={symptom.key}>
              {renderSeveritySelector(symptom.label, severities[symptom.key] || 'none', (val) =>
                handleSeverityChange(symptom.key, val)
              )}
            </React.Fragment>
          ))}

          {/* CUSTOM SIDE EFFECTS (Requirement 1) */}
          {customEffects.map((ce, idx) => (
            <React.Fragment key={ce.name + idx}>
              {renderSeveritySelector(ce.name, ce.level, (val) => handleCustomSeverityChange(idx, val))}
            </React.Fragment>
          ))}

          {!isAddingCustom ? (
            <button
              type="button"
              onClick={() => setIsAddingCustom(true)}
              className="w-full py-2 border border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-100/50 rounded-[16px] text-xs font-semibold text-amber-700 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" /> Log a new side effect (e.g. Headache, Sulfur Burps)
            </button>
          ) : (
            <div className="p-3 bg-amber-50/80 rounded-[16px] border border-amber-200 space-y-2">
              <label className="block text-xs font-semibold text-amber-900">Custom Side Effect Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Headache, Dry Mouth, Sulfur Burps"
                  value={newEffectName}
                  onChange={(e) => setNewEffectName(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-[16px] border border-amber-300 bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddCustomEffect}
                  className="px-4 py-2 bg-amber-600 text-white font-semibold rounded-[16px] text-xs"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold tracking-wider text-[#667085] mb-1.5">Notes & Reflections</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Energy levels, meals, water intake..."
              className="w-full px-3.5 py-2 rounded-[16px] border border-[#E5E7EB] bg-[#F8F9FC] text-[#111827] text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-[16px] border border-[#E5E7EB] text-[#344054] font-semibold text-sm hover:bg-[#F8F9FC] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-[16px] bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition-colors shadow-md shadow-amber-200 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Save Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
