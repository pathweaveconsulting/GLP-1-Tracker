import React, { useId, useState } from 'react';
import { Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal } from '../ui/Modal';
import { Field, FormActions, inputClass, noteClass } from '../ds';
import { WEIGHT_BOUNDS, displayToLbs, formatWeight, getWeightUnit, lbsToDisplay } from '../../lib/units';
import { similarWeight } from '../../lib/duplicates';
import { format } from 'date-fns';
import { dateOnlyToIso, isoToLocalDateString, parseDateOnly, todayLocalDateString } from '../../lib/dates';
import type { WeightEntry } from '../../types';
import { latestWeight } from '../../lib/insights';

interface Props {
  isOpen: boolean;
  /** When given, the dialog edits this weigh-in instead of adding a new one. */
  entry?: WeightEntry;
  onClose: () => void;
  onSuccess?: () => void;
  /** Called after an edit is saved, with the record as it was before the edit (for undo). */
  onEdited?: (before: WeightEntry) => void;
}

function WeightForm({ entry, onClose, onSuccess, onEdited }: Omit<Props, 'isOpen'>) {
  const { addWeight, editWeight, weights, settings } = useStore();
  const unit = getWeightUnit(settings);
  const { min, max } = WEIGHT_BOUNDS[unit];
  const latest = latestWeight(weights);
  const initialValue = entry ? String(lbsToDisplay(entry.weightLbs, unit)) : latest ? String(lbsToDisplay(latest.weightLbs, unit)) : '';
  const initialDate = entry ? isoToLocalDateString(entry.date) : todayLocalDateString();
  const [value, setValue] = useState<string>(initialValue);
  const [date, setDate] = useState<string>(initialDate);
  const [error, setError] = useState<string>();
  const [dateError, setDateError] = useState<string>();
  const [staleError, setStaleError] = useState<string>();
  // A possible duplicate is a warning, never a block: the second press of Save, unchanged, saves anyway.
  const [duplicate, setDuplicate] = useState<{ match: WeightEntry; key: string }>();
  const formKey = `${value.trim()}|${date}`;
  const warnDuplicate = duplicate?.key === formKey ? duplicate.match : undefined;
  const uid = useId();
  const today = todayLocalDateString();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(value);
    let ok = true;
    if (!value.trim() || !Number.isFinite(n) || n < min || n > max) {
      setError(`Enter a weight between ${min} and ${max} ${unit}.`);
      ok = false;
    } else setError(undefined);
    if (!parseDateOnly(date) || date > today) {
      setDateError('Choose a valid date that is not in the future.');
      ok = false;
    } else setDateError(undefined);
    if (!ok) return;
    // Canonical storage is pounds; the date is anchored at local noon so it stays on the chosen day.
    if (!entry) {
      const candidate = { weightLbs: displayToLbs(n, unit), date: dateOnlyToIso(date) };
      const match = similarWeight(weights, candidate);
      if (match && !warnDuplicate) { setDuplicate({ match, key: formKey }); return; }
      addWeight(candidate);
      onSuccess?.();
      onClose();
      return;
    }
    // Untouched fields keep their exact stored value, so opening and saving never nudges a weight through display
    // rounding or moves a weigh-in's original time.
    const next = {
      ...entry,
      weightLbs: value.trim() === initialValue ? entry.weightLbs : displayToLbs(n, unit),
      date: date === initialDate ? entry.date : dateOnlyToIso(date),
    };
    if (next.weightLbs === entry.weightLbs && next.date === entry.date) { onClose(); return; }
    const { id: _id, ...fields } = next;
    const match = similarWeight(weights, fields, entry.id);
    if (match && !warnDuplicate) { setDuplicate({ match, key: formKey }); return; }
    if (!editWeight(entry, fields)) {
      setStaleError('This weigh-in changed or was removed after you opened it. Nothing was saved. Close this window and review it again.');
      return;
    }
    onEdited?.(entry);
    onSuccess?.();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <Field label={`Weight (${unit})`} htmlFor={`${uid}-w`} error={error} errorId={`${uid}-w-err`}>
        <div className="relative">
          <input
            id={`${uid}-w`}
            type="number"
            inputMode="decimal"
            step="0.1"
            min={min}
            max={max}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${uid}-w-err` : undefined}
            className={inputClass('pr-14 text-lg font-semibold tabular-nums')}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted" aria-hidden="true">{unit}</span>
        </div>
      </Field>

      <Field label="Date" htmlFor={`${uid}-d`} error={dateError} errorId={`${uid}-d-err`}>
        <input
          id={`${uid}-d`}
          type="date"
          max={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-invalid={dateError ? true : undefined}
          aria-describedby={dateError ? `${uid}-d-err` : undefined}
          className={inputClass()}
        />
      </Field>

      {warnDuplicate && (
        <p role="alert" className={noteClass('caution')}>
          You already have {formatWeight(warnDuplicate.weightLbs, unit)} recorded on {format(new Date(warnDuplicate.date), 'EEE d MMM')}. If this is a separate weigh-in, select Save anyway; otherwise cancel.
        </p>
      )}
      {staleError && <p role="alert" className={noteClass('danger')}>{staleError}</p>}
      <FormActions onCancel={onClose} submitLabel={warnDuplicate ? 'Save anyway' : entry ? 'Save changes' : 'Save Weight'} submitIcon={<Check className="h-4 w-4" aria-hidden="true" />} />
    </form>
  );
}

export function LogWeightModal({ isOpen, entry, onClose, onSuccess, onEdited }: Props) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={entry ? 'Edit weight' : 'Log weight'}
      subtitle={entry ? 'Change the weight or the day of this weigh-in' : 'Record your body weight for a day'}
    >
      <WeightForm key={entry?.id ?? 'new'} entry={entry} onClose={onClose} onSuccess={onSuccess} onEdited={onEdited} />
    </Modal>
  );
}
