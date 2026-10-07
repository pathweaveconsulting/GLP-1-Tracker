import React, { useId, useState } from 'react';
import { Smile, Check, Plus } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { EffectEntry, Severity } from '../../types';
import { Modal } from '../ui/Modal';
import { COLLECTED_FIELDS, OPTIONAL_FIELDS, SEVERITIES, severityLabel } from '../../lib/symptoms';
import { dateOnlyToIso, isoToLocalDateString, parseDateOnly, todayLocalDateString } from '../../lib/dates';

interface Props {
  isOpen: boolean;
  effect?: EffectEntry;
  onClose: () => void;
  onSuccess?: () => void;
}

const ACTIVE: Record<Severity, string> = {
  none: 'bg-[#E5E7EB] border-slate-400 text-[#111827]',
  mild: 'bg-amber-100 border-amber-400 text-amber-900',
  moderate: 'bg-orange-100 border-orange-400 text-orange-900',
  severe: 'bg-rose-100 border-rose-500 text-rose-900',
};

function SeveritySelector({ label, value, onChange }: { label: string; value: Severity | undefined; onChange: (v: Severity | undefined) => void }) {
  const id = useId();
  return (
    <div className="space-y-1" role="group" aria-labelledby={id}>
      <span id={id} className="block text-xs font-semibold text-[#344054]">{label}</span>
      <div className="grid grid-cols-4 gap-1.5">
        {SEVERITIES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={value === s}
            onClick={() => onChange(s)}
            className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${value === s ? ACTIVE[s] : 'border-[#E5E7EB] text-muted hover:bg-[#F8F9FC]'}`}
          >
            {severityLabel(s)}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => onChange(undefined)} className="text-xs text-muted underline">Not recorded</button>
    </div>
  );
}

function EffectsForm({ onClose, onSuccess, effect }: Omit<Props, 'isOpen'>) {
  const addEffect = useStore((s) => s.addEffect);
  const updateEffect = useStore((s) => s.updateEffect);
  const fields = effect ? [...COLLECTED_FIELDS, ...OPTIONAL_FIELDS.filter((f) => effect[f.key] != null)] : COLLECTED_FIELDS;
  const initialDate = effect ? isoToLocalDateString(effect.date) : todayLocalDateString();
  const uid = useId();
  const today = todayLocalDateString();
  const [date, setDate] = useState<string>(initialDate);
  const [dateError, setDateError] = useState<string>();
  // No rating is selected until the user explicitly chooses one.
  const [severities, setSeverities] = useState<Record<string, Severity | undefined>>(() => Object.fromEntries(fields.filter((f) => effect?.[f.key] != null).map((f) => [f.key, effect![f.key]])));
  const [customEffects, setCustomEffects] = useState<Array<{ name: string; level?: Severity }>>(() => Object.entries(effect?.customEffects ?? {}).map(([name, level]) => ({name, level})));
  const [newEffectName, setNewEffectName] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [notes, setNotes] = useState(effect?.notes ?? '');

  const sev = (k: string): Severity | undefined => severities[k];

  const handleAddCustomEffect = () => {
    const name = newEffectName.trim();
    if (!name || customEffects.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
    setCustomEffects((prev) => [...prev, { name }]);
    setNewEffectName('');
    setIsAddingCustom(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parseDateOnly(date) || date > today) {
      setDateError('Choose a valid date that is not in the future.');
      return;
    }
    const customRecord: Record<string, Severity> = {};
    customEffects.forEach((ce) => { if (ce.level != null) customRecord[ce.name] = ce.level; });

    const updated = {
      date: effect && date === initialDate ? effect.date : dateOnlyToIso(date),
      ...severities,
      customEffects: customRecord,
      notes,
    };
    if (effect) updateEffect(effect.id, updated);
    else addEffect(updated);
    onSuccess?.();
    onClose();
  };

  const anySevere = Object.values(severities).includes('severe') || customEffects.some((c) => c.level === 'severe');

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor={`${uid}-date`} className="block text-xs font-semibold text-muted mb-1.5">Date</label>
        <input
          id={`${uid}-date`}
          type="date"
          max={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-invalid={dateError ? true : undefined}
          className="w-full px-3.5 py-2.5 rounded-[16px] border border-[#E5E7EB] bg-[#F8F9FC] text-[#111827] text-sm font-medium focus:ring-2 focus:ring-amber-700 focus:outline-none"
        />
        {dateError && <p role="alert" className="text-xs text-danger mt-1">{dateError}</p>}
      </div>

      <p className="text-xs text-muted">Choose ratings for the symptoms you want to record. Unanswered symptoms stay not recorded; select None only when you mean none.</p>
      {fields.map((s) => (
        <SeveritySelector key={s.key} label={s.key === 'hunger' ? 'Hunger level' : s.label} value={sev(s.key)} onChange={(v) => setSeverities((p) => ({ ...p, [s.key]: v }))} />
      ))}

      {customEffects.map((ce, idx) => (
        <SeveritySelector key={ce.name} label={ce.name} value={ce.level} onChange={(v) => setCustomEffects((prev) => prev.map((c, i) => (i === idx ? { ...c, level: v } : c)))} />
      ))}

      {!isAddingCustom ? (
        <button type="button" onClick={() => setIsAddingCustom(true)} className="w-full py-2 border border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-100/50 rounded-[16px] text-xs font-semibold text-amber-800 flex items-center justify-center gap-1.5 transition-colors">
          <Plus className="w-4 h-4" aria-hidden="true" /> Log another symptom (e.g. headache, dry mouth)
        </button>
      ) : (
        <div className="p-3 bg-amber-50/80 rounded-[16px] border border-amber-200 space-y-2">
          <label htmlFor={`${uid}-custom`} className="block text-xs font-semibold text-amber-900">Symptom name</label>
          <div className="flex gap-2">
            <input id={`${uid}-custom`} type="text" placeholder="e.g. Headache, dry mouth" value={newEffectName} onChange={(e) => setNewEffectName(e.target.value)} className="flex-1 px-3 py-2 text-xs rounded-[16px] border border-amber-300 bg-white" />
            <button type="button" onClick={handleAddCustomEffect} className="px-4 py-2 bg-amber-700 text-white font-semibold rounded-[16px] text-xs">Add</button>
          </div>
        </div>
      )}

      {anySevere && (
        <p role="status" className="text-xs bg-rose-50 border border-rose-200 text-rose-900 rounded-[14px] px-3 py-2">
          You marked something as severe. If it’s intense, getting worse or not easing, please contact your care team or urgent care.
        </p>
      )}

      <div>
        <label htmlFor={`${uid}-notes`} className="block text-xs font-semibold text-muted mb-1.5">Notes & reflections</label>
        <textarea id={`${uid}-notes`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Energy, meals, water intake…" className="w-full px-3.5 py-2 rounded-[16px] border border-[#E5E7EB] bg-[#F8F9FC] text-[#111827] text-sm focus:ring-2 focus:ring-amber-700 focus:outline-none" />
      </div>

      <div className="pt-2 flex gap-3">
        <button type="button" onClick={onClose} className="flex-1 py-3 px-4 rounded-[16px] border border-[#E5E7EB] text-[#344054] font-semibold text-sm hover:bg-[#F8F9FC] transition-colors">Cancel</button>
        <button type="submit" className="flex-1 py-3 px-4 rounded-[16px] bg-amber-700 text-white font-semibold text-sm hover:bg-amber-800 transition-colors shadow-md shadow-amber-200 flex items-center justify-center gap-2">
          <Check className="w-4 h-4" aria-hidden="true" /> Save Log
        </button>
      </div>
    </form>
  );
}

export function LogEffectsModal({ isOpen, onClose, onSuccess, effect }: Props) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={effect ? "Edit symptom log" : "Log How You Feel"}
      subtitle="Appetite, side effects and anything else you notice"
      icon={<div className="w-10 h-10 rounded-[16px] bg-amber-50 flex items-center justify-center text-caution"><Smile className="w-5 h-5" aria-hidden="true" /></div>}
    >
      <EffectsForm key={effect?.id ?? "new"} onClose={onClose} onSuccess={onSuccess} effect={effect} />
    </Modal>
  );
}
