import React, { useId, useState } from 'react';
import { Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal } from '../ui/Modal';
import { Field, FormActions, inputClass } from '../ds';
import { WEIGHT_BOUNDS, displayToLbs, getWeightUnit, lbsToDisplay } from '../../lib/units';
import { dateOnlyToIso, parseDateOnly, todayLocalDateString } from '../../lib/dates';
import { latestWeight } from '../../lib/insights';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function WeightForm({ onClose, onSuccess }: Omit<Props, 'isOpen'>) {
  const { addWeight, weights, settings } = useStore();
  const unit = getWeightUnit(settings);
  const { min, max } = WEIGHT_BOUNDS[unit];
  const latest = latestWeight(weights);
  const [value, setValue] = useState<string>(latest ? String(lbsToDisplay(latest.weightLbs, unit)) : '');
  const [date, setDate] = useState<string>(todayLocalDateString());
  const [error, setError] = useState<string>();
  const [dateError, setDateError] = useState<string>();
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
    addWeight({ weightLbs: displayToLbs(n, unit), date: dateOnlyToIso(date) });
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

      <FormActions onCancel={onClose} submitLabel="Save Weight" submitIcon={<Check className="h-4 w-4" aria-hidden="true" />} />
    </form>
  );
}

export function LogWeightModal({ isOpen, onClose, onSuccess }: Props) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Log weight"
      subtitle="Record your body weight for a day"
    >
      <WeightForm onClose={onClose} onSuccess={onSuccess} />
    </Modal>
  );
}
