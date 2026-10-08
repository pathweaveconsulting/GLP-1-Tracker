import React, { useId, useState } from 'react';
import { Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Medication } from '../../types';
import { Modal } from '../ui/Modal';
import { choiceClass, errorClass, FormActions, helpClass, inputClass, labelClass } from '../ds';
import { OtherMedicationNote } from '../OtherMedicationNote';
import { MEDICATION_OPTIONS } from '../../lib/medications';
import { WeightUnit, convertTyped, getWeightUnit, lbsToInput } from '../../lib/units';
import { ProfileField, ProfileFormInput, validateProfile } from '../../lib/profile';
import { isoToLocalDateString } from '../../lib/dates';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const inputCls = inputClass();
const labelCls = `${labelClass} mb-1.5`;

export { convertTyped };

function ProfileForm({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useStore();
  const uid = useId();
  const unit0 = getWeightUnit(settings);
  const [form, setForm] = useState<ProfileFormInput>({
    medication: settings.medication,
    unit: unit0,
    startingWeight: settings.startingWeight > 0 ? String(lbsToInput(settings.startingWeight, unit0)) : '',
    goalWeight: settings.targetWeight > 0 ? String(lbsToInput(settings.targetWeight, unit0)) : '',
    heightFt: settings.heightInches > 0 ? String(Math.floor(settings.heightInches / 12)) : '',
    heightIn: settings.heightInches > 0 ? String(Math.round(settings.heightInches % 12)) : '',
    heightCm: settings.heightInches > 0 ? String(Number((settings.heightInches * 2.54).toFixed(2))) : '',
    startDate: isoToLocalDateString(settings.startDate),
  });
  const [errors, setErrors] = useState<Partial<Record<ProfileField, string>>>({});
  // Only fields the user actually edited are converted back; everything else keeps its exact stored value.
  const [touched, setTouched] = useState<Set<ProfileField>>(new Set());
  const id = (n: string) => `${uid}-${n}`;
  const set = <K extends ProfileField>(k: K, v: ProfileFormInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setTouched((t) => new Set(t).add(k));
  };

  const switchUnit = (to: WeightUnit) => {
    const heightTouched = touched.has('heightFt') || touched.has('heightIn') || touched.has('heightCm');
    const height = !heightTouched ? settings.heightInches : form.unit === 'kg' ? Number(form.heightCm) / 2.54 : Number(form.heightFt) * 12 + Number(form.heightIn);
    const hasHeight = !heightTouched || (form.unit === 'kg' ? form.heightCm : form.heightFt)?.trim();
    setForm(f => ({ ...f, unit: to,
      startingWeight: convertTyped(f.startingWeight, f.unit, to),
      goalWeight: convertTyped(f.goalWeight, f.unit, to),
      ...(hasHeight && Number.isFinite(height) ? (to === 'kg' ? { heightCm: String(Number((height * 2.54).toFixed(6))) } : { heightFt: String(Math.floor(height / 12)), heightIn: String(Number((height % 12).toFixed(6))) }) : {}),
    }));
  };

  const err = (f: ProfileField) =>
    errors[f] ? <p id={id(`${f}-err`)} role="alert" className={`mt-1 ${errorClass}`}>{errors[f]}</p> : null;
  const aria = (f: ProfileField) => ({ 'aria-invalid': errors[f] ? true : undefined, 'aria-describedby': errors[f] ? id(`${f}-err`) : undefined });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateProfile(form);
    setErrors(result.errors);
    if (!result.value) return;
    // Keep the original start instant. Weights and height are only replaced when the user edited them, so opening
    // and saving the form (or flipping the unit toggle) can never nudge a stored value through display rounding.
    const heightTouched = touched.has('heightFt') || touched.has('heightIn') || touched.has('heightCm');
    updateSettings({
      ...result.value,
      startDate: settings.startDate,
      startingWeight: touched.has('startingWeight') ? result.value.startingWeight : settings.startingWeight,
      targetWeight: touched.has('goalWeight') ? result.value.targetWeight : settings.targetWeight,
      heightInches: heightTouched ? result.value.heightInches : settings.heightInches,
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor={id('med')} className={labelCls}>Primary medication</label>
        <select id={id('med')} value={form.medication} onChange={(e) => set('medication', e.target.value as Medication)} className={inputCls} {...aria('medication')}>
          {MEDICATION_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        {err('medication')}
        <p className={`mt-1.5 ${helpClass}`}>Weekly injection models only. For oral semaglutide, including Wegovy tablets or Rybelsus, select Other. Verify your exact product and prescription with your pharmacist.</p>
        <OtherMedicationNote medication={form.medication || undefined} className="mt-2" />
      </div>

      <fieldset>
        <legend className={labelCls}>Weight unit</legend>
        <div className="flex gap-2">
          {(['lbs', 'kg'] as WeightUnit[]).map((u) => (
            <button key={u} type="button" aria-pressed={form.unit === u} onClick={() => switchUnit(u)}
              className={choiceClass(form.unit === u, 'min-w-16')}>
              {u}
            </button>
          ))}
        </div>
        <p className={`mt-1.5 ${helpClass}`}>Your logged weights are kept as they are and shown in this unit.</p>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={id('sw')} className={labelCls}>Starting weight ({form.unit})</label>
          <input id={id('sw')} type="number" step="0.1" inputMode="decimal" value={form.startingWeight} onChange={(e) => set('startingWeight', e.target.value)} className={inputCls} {...aria('startingWeight')} />
          {err('startingWeight')}
        </div>
        <div>
          <label htmlFor={id('gw')} className={labelCls}>Goal weight ({form.unit})</label>
          <input id={id('gw')} type="number" step="0.1" inputMode="decimal" value={form.goalWeight} onChange={(e) => set('goalWeight', e.target.value)} className={inputCls} {...aria('goalWeight')} />
          {err('goalWeight')}
        </div>
      </div>

      {form.unit === 'kg' ? <div>
        <label htmlFor={id('hc')} className={labelCls}>Height (cm)</label>
        <input id={id('hc')} type="number" step="any" inputMode="decimal" value={form.heightCm} onChange={e => set('heightCm', e.target.value)} className={inputCls} {...aria('heightCm')} />
        {err('heightCm')}
      </div> : <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={id('hf')} className={labelCls}>Height (feet)</label>
          <input id={id('hf')} type="number" inputMode="numeric" value={form.heightFt} onChange={(e) => set('heightFt', e.target.value)} className={inputCls} {...aria('heightFt')} />
          {err('heightFt')}
        </div>
        <div>
          <label htmlFor={id('hi')} className={labelCls}>Height (inches)</label>
          <input id={id('hi')} type="number" inputMode="decimal" value={form.heightIn} onChange={(e) => set('heightIn', e.target.value)} className={inputCls} {...aria('heightIn')} />
          {err('heightIn')}
        </div>
      </div>

      }
      <FormActions onCancel={onClose} submitLabel="Save Profile" submitIcon={<Check className="h-4 w-4" aria-hidden="true" />} />
    </form>
  );
}

export function EditProfileModal({ isOpen, onClose }: Props) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Edit profile details"
      subtitle="Medication, units, starting and goal weight, height"
    >
      <ProfileForm onClose={onClose} />
    </Modal>
  );
}
