import React, { useId, useState } from 'react';
import { Scale, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Modal } from '../ui/Modal';
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
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor={`${uid}-w`} className="block text-xs font-semibold text-muted mb-1.5">Weight ({unit})</label>
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
            className="w-full px-4 py-3 rounded-[16px] border border-line bg-canvas text-ink text-lg font-semibold focus:ring-2 focus:ring-emerald-700 focus:outline-none"
          />
          <span className="absolute right-4 top-3.5 text-sm font-semibold text-subtle" aria-hidden="true">{unit}</span>
        </div>
        {error && <p id={`${uid}-w-err`} role="alert" className="text-xs text-danger mt-1">{error}</p>}
      </div>

      <div>
        <label htmlFor={`${uid}-d`} className="block text-xs font-semibold text-muted mb-1.5">Date</label>
        <input
          id={`${uid}-d`}
          type="date"
          max={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-invalid={dateError ? true : undefined}
          aria-describedby={dateError ? `${uid}-d-err` : undefined}
          className="w-full px-3.5 py-2.5 rounded-[16px] border border-line bg-canvas text-ink text-sm font-medium focus:ring-2 focus:ring-emerald-700 focus:outline-none"
        />
        {dateError && <p id={`${uid}-d-err`} role="alert" className="text-xs text-danger mt-1">{dateError}</p>}
      </div>

      <div className="pt-2 flex gap-3">
        <button type="button" onClick={onClose} className="flex-1 py-3 px-4 rounded-[16px] border border-line text-ink-2 font-semibold text-sm hover:bg-canvas transition-colors">
          Cancel
        </button>
        <button type="submit" className="flex-1 py-3 px-4 rounded-[16px] bg-[#15803D] text-white font-semibold text-sm hover:bg-[#166534] transition-colors shadow-md shadow-emerald-200 flex items-center justify-center gap-2">
          <Check className="w-4 h-4" aria-hidden="true" /> Save Weight
        </button>
      </div>
    </form>
  );
}

export function LogWeightModal({ isOpen, onClose, onSuccess }: Props) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Log Weight"
      subtitle="Record your current body weight"
      icon={<div className="w-10 h-10 rounded-[16px] bg-emerald-50 flex items-center justify-center text-positive"><Scale className="w-5 h-5" aria-hidden="true" /></div>}
    >
      <WeightForm onClose={onClose} onSuccess={onSuccess} />
    </Modal>
  );
}
