import React, { useId, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { EffectEntry, Severity } from '../../types';
import { Modal } from '../ui/Modal';
import { choiceClass, Field, FormActions, helpClass, inputClass, labelClass, noteClass } from '../ds';
import { COLLECTED_FIELDS, OPTIONAL_FIELDS, SEVERITIES, severityLabel } from '../../lib/symptoms';
import { dateOnlyToIso, isoToLocalDateString, parseDateOnly, todayLocalDateString } from '../../lib/dates';

interface Props {
  isOpen: boolean;
  effect?: EffectEntry;
  onClose: () => void;
  onSuccess?: () => void;
}

function SeveritySelector({ label, value, onChange }: { label: string; value: Severity | undefined; onChange: (v: Severity | undefined) => void }) {
  const id = useId();
  return (
    <div className="space-y-1.5" role="group" aria-labelledby={id}>
      <div className="flex items-baseline justify-between gap-2">
        <span id={id} className={labelClass}>{label}</span>
        <button type="button" onClick={() => onChange(undefined)} className="min-h-9 px-1 text-[13px] text-muted underline underline-offset-2 hover:text-ink">Not recorded</button>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {SEVERITIES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={value === s}
            onClick={() => onChange(s)}
            className={choiceClass(value === s, 'px-1')}
          >
            {severityLabel(s)}
          </button>
        ))}
      </div>
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
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <Field label="Date" htmlFor={`${uid}-date`} error={dateError}>
        <input id={`${uid}-date`} type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={dateError ? true : undefined} className={inputClass()} />
      </Field>

      <p className={helpClass}>Choose ratings for the symptoms you want to record. Unanswered symptoms stay not recorded; select None only when you mean none.</p>
      {fields.map((s) => (
        <SeveritySelector key={s.key} label={s.key === 'hunger' ? 'Hunger level' : s.label} value={sev(s.key)} onChange={(v) => setSeverities((p) => ({ ...p, [s.key]: v }))} />
      ))}

      {customEffects.map((ce, idx) => (
        <SeveritySelector key={ce.name} label={ce.name} value={ce.level} onChange={(v) => setCustomEffects((prev) => prev.map((c, i) => (i === idx ? { ...c, level: v } : c)))} />
      ))}

      {!isAddingCustom ? (
        <button type="button" onClick={() => setIsAddingCustom(true)} className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-[var(--radius-control)] border border-dashed border-line-strong text-sm font-semibold text-brand hover:bg-brand-soft">
          <Plus className="w-4 h-4" aria-hidden="true" /> Log another symptom (e.g. headache, dry mouth)
        </button>
      ) : (
        <div className="space-y-1.5 rounded-[var(--radius-control)] border border-line bg-canvas p-3">
          <label htmlFor={`${uid}-custom`} className={labelClass}>Symptom name</label>
          <div className="flex gap-2">
            <input id={`${uid}-custom`} type="text" placeholder="e.g. Headache, dry mouth" value={newEffectName} onChange={(e) => setNewEffectName(e.target.value)} className={inputClass('flex-1')} />
            <button type="button" onClick={handleAddCustomEffect} className="min-h-11 rounded-[var(--radius-control)] bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong">Add</button>
          </div>
        </div>
      )}

      {anySevere && (
        <p role="status" className={noteClass('danger')}>
          You marked something as severe. If it’s intense, getting worse or not easing, please contact your care team or urgent care.
        </p>
      )}

      <div>
        <label htmlFor={`${uid}-notes`} className={`${labelClass} mb-1.5`}>Notes & reflections</label>
        <textarea id={`${uid}-notes`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Energy, meals, water intake…" className={inputClass()} />
      </div>

      <FormActions onCancel={onClose} submitLabel="Save Log" submitIcon={<Check className="h-4 w-4" aria-hidden="true" />} />
    </form>
  );
}

export function LogEffectsModal({ isOpen, onClose, onSuccess, effect }: Props) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={effect ? "Edit symptom log" : "Log how you feel"}
      subtitle="Appetite, side effects and anything else you notice"
    >
      <EffectsForm key={effect?.id ?? "new"} onClose={onClose} onSuccess={onSuccess} effect={effect} />
    </Modal>
  );
}
