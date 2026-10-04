import React, { useId, useState } from 'react';
import { useStore } from '../store/useStore';
import { MEDICATION_OPTIONS } from '../lib/medications';
import { ProfileField, ProfileFormInput, earliestEntryDefaults, validateProfile } from '../lib/profile';
import { todayLocalDateString } from '../lib/dates';
import { SafetyNotice } from '../components/SafetyNotice';
import type { Medication } from '../types';
import { lbsToDisplay, type WeightUnit } from '../lib/units';

const inputCls =
  'w-full px-3.5 py-2.5 rounded-[16px] border border-[#E5E7EB] bg-[#F8F9FC] text-[#111827] text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none';
const labelCls = 'block text-xs font-semibold text-[#667085] mb-1.5';

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-rose-600 mt-1">
      {message}
    </p>
  );
}

export function Onboarding() {
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const keptWeights = useStore((s) => s.weights);
  const keptDoses = useStore((s) => s.doses);
  const keptEffects = useStore((s) => s.effects);
  const keptSettings = useStore((s) => s.settings);
  const kept = { weights: keptWeights, doses: keptDoses, effects: keptEffects, settings: keptSettings };
  const uid = useId();
  const today = todayLocalDateString();

  // "Welcome back": real entries survived an upgrade, so pre-fill from them instead of starting blank.
  const keptCount = kept.weights.length + kept.doses.length + kept.effects.length;
  const welcomeBack = keptCount > 0;
  const defaults = earliestEntryDefaults(kept);
  const unit0: WeightUnit = welcomeBack && kept.settings.weightUnit === 'kg' ? 'kg' : 'lbs';

  const [form, setForm] = useState<ProfileFormInput>({
    medication: welcomeBack ? kept.settings.medication : 'Tirzepatide',
    unit: unit0,
    startingWeight: welcomeBack && defaults.startingWeightLbs != null ? String(lbsToDisplay(defaults.startingWeightLbs, unit0)) : '',
    goalWeight: '',
    heightFt: '',
    heightIn: '',
    startDate: welcomeBack && defaults.startDate ? defaults.startDate : today,
  });
  const [acknowledged, setAcknowledged] = useState(false);
  const [ackError, setAckError] = useState<string>();
  const [errors, setErrors] = useState<Partial<Record<ProfileField, string>>>({});

  const set = <K extends ProfileField>(key: K, value: ProfileFormInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const id = (name: string) => `${uid}-${name}`;
  const errProps = (field: ProfileField) => ({
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? id(`${field}-err`) : undefined,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateProfile(form, today);
    setErrors(result.errors);
    if (!acknowledged) {
      setAckError('Please confirm you have read this before continuing.');
    } else {
      setAckError(undefined);
    }
    if (result.value && acknowledged) completeOnboarding(result.value, { seedStartingWeight: !welcomeBack });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-[#111827] font-sans antialiased flex items-start md:items-center justify-center p-4">
      <main className="w-full max-w-xl bg-white rounded-[24px] border border-[#E5E7EB] shadow-xs p-6 md:p-8 my-6">
        <h1 className="text-2xl font-semibold tracking-tight">{welcomeBack ? 'Welcome back. Let’s confirm your details.' : 'Welcome. Let’s set up your journey.'}</h1>
        <p className="text-sm text-[#667085] mt-1.5 leading-relaxed">
          {welcomeBack
            ? `We kept your ${keptCount} ${keptCount === 1 ? 'entry' : 'entries'}. This version needs your goal and height again so every number is based on you. We pre-filled what we could from your earliest entries; please check it.`
            : 'A few details so every number you see is based on you. Everything stays on this device. Nothing is uploaded.'}
        </p>

        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          <div>
            <label htmlFor={id('medication')} className={labelCls}>Medication</label>
            <select
              id={id('medication')}
              value={form.medication}
              onChange={(e) => set('medication', e.target.value as Medication)}
              className={inputCls}
              {...errProps('medication')}
            >
              {MEDICATION_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <FieldError id={id('medication-err')} message={errors.medication} />
          </div>

          <fieldset>
            <legend className={labelCls}>Weight unit</legend>
            <div className="flex gap-2">
              {(['lbs', 'kg'] as WeightUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  aria-pressed={form.unit === u}
                  onClick={() => set('unit', u)}
                  className={`px-4 py-2 rounded-[14px] text-sm font-semibold border transition-colors ${form.unit === u ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-[#344054] border-[#E5E7EB] hover:bg-[#F8F9FC]'}`}
                >
                  {u}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={id('startingWeight')} className={labelCls}>Starting weight ({form.unit})</label>
              <input
                id={id('startingWeight')}
                type="number"
                inputMode="decimal"
                step="0.1"
                value={form.startingWeight}
                onChange={(e) => set('startingWeight', e.target.value)}
                className={inputCls}
                {...errProps('startingWeight')}
              />
              <FieldError id={id('startingWeight-err')} message={errors.startingWeight} />
            </div>
            <div>
              <label htmlFor={id('goalWeight')} className={labelCls}>Goal weight ({form.unit})</label>
              <input
                id={id('goalWeight')}
                type="number"
                inputMode="decimal"
                step="0.1"
                value={form.goalWeight}
                onChange={(e) => set('goalWeight', e.target.value)}
                className={inputCls}
                {...errProps('goalWeight')}
              />
              <FieldError id={id('goalWeight-err')} message={errors.goalWeight} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={id('heightFt')} className={labelCls}>Height (feet)</label>
              <input
                id={id('heightFt')}
                type="number"
                inputMode="numeric"
                value={form.heightFt}
                onChange={(e) => set('heightFt', e.target.value)}
                className={inputCls}
                {...errProps('heightFt')}
              />
              <FieldError id={id('heightFt-err')} message={errors.heightFt} />
            </div>
            <div>
              <label htmlFor={id('heightIn')} className={labelCls}>Height (inches)</label>
              <input
                id={id('heightIn')}
                type="number"
                inputMode="decimal"
                value={form.heightIn}
                onChange={(e) => set('heightIn', e.target.value)}
                className={inputCls}
                {...errProps('heightIn')}
              />
              <FieldError id={id('heightIn-err')} message={errors.heightIn} />
            </div>
          </div>

          <div>
            <label htmlFor={id('startDate')} className={labelCls}>Treatment start date</label>
            <input
              id={id('startDate')}
              type="date"
              max={today}
              value={form.startDate}
              onChange={(e) => set('startDate', e.target.value)}
              className={inputCls}
              {...errProps('startDate')}
            />
            <FieldError id={id('startDate-err')} message={errors.startDate} />
          </div>

          <SafetyNotice variant="full" medication={form.medication} />

          <div>
            <label className="flex items-start gap-2.5 text-sm text-[#344054]">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                aria-describedby={ackError ? id('ack-err') : undefined}
                className="mt-0.5 h-4 w-4 rounded border-[#D0D5DD]"
              />
              <span>I understand this app does not give medical advice and I will follow my clinician's instructions.</span>
            </label>
            <FieldError id={id('ack-err')} message={ackError} />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-[16px] bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors"
          >
            Start my journey
          </button>
        </form>
      </main>
    </div>
  );
}
