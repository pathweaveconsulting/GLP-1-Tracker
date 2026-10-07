import React, { useEffect, useId, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { MEDICATION_OPTIONS } from '../lib/medications';
import { ProfileField, ProfileFormInput, earliestEntryDefaults, validateProfile } from '../lib/profile';
import { todayLocalDateString } from '../lib/dates';
import { OtherMedicationNote } from '../components/OtherMedicationNote';
import { SafetyNotice } from '../components/SafetyNotice';
import type { Medication } from '../types';
import { convertTyped, displayToLbs, lbsToDisplay, lbsToInput, type WeightUnit } from '../lib/units';

const inputCls =
  'w-full px-3.5 py-2.5 rounded-[16px] border border-[#E5E7EB] bg-[#F8F9FC] text-[#111827] text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none';
const labelCls = 'block text-xs font-semibold text-muted mb-1.5';

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-danger mt-1">
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
    medication: welcomeBack ? kept.settings.medication : '',
    unit: unit0,
    startingWeight: welcomeBack && defaults.startingWeightLbs != null ? String(lbsToDisplay(defaults.startingWeightLbs, unit0)) : '',
    goalWeight: '',
    heightFt: '',
    heightIn: '',
    heightCm: '',
    startDate: welcomeBack && defaults.startDate ? defaults.startDate : '',
  });
  const [step, setStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, [step]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [ackError, setAckError] = useState<string>();
  const [errors, setErrors] = useState<Partial<Record<ProfileField, string>>>({});

  const set = <K extends ProfileField>(key: K, value: ProfileFormInput[K]) => { setAcknowledged(false); setAckError(undefined); setForm(f => ({ ...f, [key]: value })); };
  // The exact pounds behind a converted number, so toggling back restores what was typed instead of a rounded copy.
  const exact = useRef<Partial<Record<'startingWeight' | 'goalWeight', { text: string; lbs: number }>>>({});
  const setUnit = (to: WeightUnit) => {
    if (form.unit === to) return;
    setAcknowledged(false); setAckError(undefined);
    // Computed outside the state updater: it touches the ref, and updaters may run twice.
    const convert = (field: 'startingWeight' | 'goalWeight') => {
      const text = form[field];
      const stash = exact.current[field];
      const known = stash && stash.text === text ? stash.lbs : null;
      const out = known != null ? String(lbsToInput(known, to)) : convertTyped(text, form.unit, to);
      const n = Number(text);
      if (text.trim() && Number.isFinite(n)) exact.current[field] = { text: out, lbs: known ?? displayToLbs(n, form.unit) };
      return out;
    };
    const startingWeight = convert('startingWeight');
    const goalWeight = convert('goalWeight');
    const height = form.unit === 'kg' ? Number(form.heightCm) / 2.54 : Number(form.heightFt) * 12 + Number(form.heightIn);
    const hasHeight = (form.unit === 'kg' ? form.heightCm : form.heightFt)?.trim();
    setForm((f) => ({ ...f, unit: to, startingWeight, goalWeight,
      ...(hasHeight && Number.isFinite(height) ? (to === 'kg' ? { heightCm: String(Number((height * 2.54).toFixed(6))) } : { heightFt: String(Math.floor(height / 12)), heightIn: String(Number((height % 12).toFixed(6))) }) : {}),
    }));
  };
  const id = (name: string) => `${uid}-${name}`;
  const errProps = (field: ProfileField) => ({
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? id(`${field}-err`) : undefined,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateProfile(form, today);
    const fields: ProfileField[] = step === 0 ? ['medication', 'startingWeight', 'goalWeight'] : step === 1 ? ['heightFt', 'heightIn', 'heightCm', 'startDate'] : Object.keys(result.errors) as ProfileField[];
    const visibleErrors = Object.fromEntries(Object.entries(result.errors).filter(([key]) => fields.includes(key as ProfileField)));
    setErrors(visibleErrors);
    if (Object.keys(visibleErrors).length) { requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()); return; }
    if (step < 2) { setStep(step + 1); return; }
    if (!acknowledged) {
      setAckError('Please confirm you have read this before continuing.');
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.focus());
    } else {
      setAckError(undefined);
    }
    if (result.value && acknowledged) completeOnboarding(result.value, { seedStartingWeight: !welcomeBack });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-[#111827] font-sans antialiased flex items-start md:items-center justify-center p-4">
      <main className="w-full max-w-xl bg-white rounded-[24px] border border-[#E5E7EB] shadow-xs p-6 md:p-8 my-6">
        <h1 className="text-2xl font-semibold tracking-tight">{welcomeBack ? 'Welcome back. Let’s confirm your details.' : 'Welcome. Let’s set up your journey.'}</h1>
        <p className="text-sm text-muted mt-1.5 leading-relaxed">
          {welcomeBack
            ? `We kept your ${keptCount} ${keptCount === 1 ? 'entry' : 'entries'}. This version needs your goal and height again so every number is based on you. We pre-filled what we could from your earliest entries; please check it.`
            : 'A few details so every number you see is based on you. Everything stays on this device. Nothing is uploaded.'}
        </p>

        <ol aria-label="Setup progress" className="flex gap-3 text-xs text-muted mt-4">
          {['Medication and weight', 'Height and start date', 'Review and safety'].map((name, index) => <li key={name} aria-current={step === index ? 'step' : undefined} className={step === index ? 'font-semibold text-[#111827]' : ''}>{index + 1}. {name}</li>)}
        </ol>
        <h2 ref={headingRef} tabIndex={-1} className="mt-4 text-lg font-semibold focus:outline-none">Step {step + 1} of 3: {['Your medication and weight', 'Your height and start date', 'Review before starting'][step]}</h2>
        <form ref={formRef} onSubmit={submit} noValidate className="mt-6 space-y-4">
          {step === 0 && <>
          <div>
            <label htmlFor={id('medication')} className={labelCls}>Medication</label>
            <select
              id={id('medication')}
              value={form.medication}
              onChange={(e) => set('medication', e.target.value as Medication)}
              className={inputCls}
              {...errProps('medication')}
            >
              <option value="">Choose your medication</option>
              {MEDICATION_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <FieldError id={id('medication-err')} message={errors.medication} />
            <p className="mt-2 text-xs text-muted">Weekly injection models only. For oral semaglutide, including Wegovy tablets or Rybelsus, select Other. Verify your exact product and prescription with your pharmacist.</p>
        <OtherMedicationNote medication={form.medication || undefined} className="mt-2" />
          </div>

          <fieldset>
            <legend className={labelCls}>Weight unit</legend>
            <div className="flex gap-2">
              {(['lbs', 'kg'] as WeightUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  aria-pressed={form.unit === u}
                  onClick={() => setUnit(u)}
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

          </>}
          {step === 1 && <>
          {form.unit === 'kg' ? <div>
            <label htmlFor={id('heightCm')} className={labelCls}>Height (cm)</label>
            <input id={id('heightCm')} type="number" inputMode="decimal" step="any" value={form.heightCm} onChange={e => set('heightCm', e.target.value)} className={inputCls} {...errProps('heightCm')} />
            <FieldError id={id('heightCm-err')} message={errors.heightCm} />
          </div> : <div className="grid grid-cols-2 gap-3">
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

          }
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

          </>}
          {step === 2 && <>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted">Medication</dt><dd>{form.medication}</dd></div>
            <div><dt className="text-muted">Treatment start date</dt><dd>{form.startDate}</dd></div>
            <div><dt className="text-muted">Starting weight</dt><dd>{form.startingWeight} {form.unit}</dd></div>
            <div><dt className="text-muted">Goal weight</dt><dd>{form.goalWeight} {form.unit}</dd></div>
            <div><dt className="text-muted">Height</dt><dd>{form.unit === 'kg' ? `${form.heightCm} cm` : `${form.heightFt} ft ${form.heightIn || '0'} in`}</dd></div>
          </dl>
          <p className="text-xs text-muted">Check these values against your own records and prescription. This review does not recommend a medication, dose or weight goal.</p>
          <SafetyNotice variant="full" medication={form.medication || undefined} />

          <div>
            <label className="flex items-start gap-2.5 text-sm text-[#344054]">
              <input
                type="checkbox"
                checked={acknowledged}
                aria-invalid={ackError ? true : undefined}
                onChange={(e) => setAcknowledged(e.target.checked)}
                aria-describedby={ackError ? id('ack-err') : undefined}
                className="mt-0.5 h-5 w-5 rounded border-[#D0D5DD] focus-visible:ring-2 focus-visible:ring-[#6D4AFF]"
              />
              <span>I understand this app does not give medical advice and I will follow my clinician's instructions.</span>
            </label>
            <FieldError id={id('ack-err')} message={ackError} />
          </div>

          </>}
          {step < 2 && <SafetyNotice variant="compact" showHelpLink={false} medication={form.medication || undefined} />}
          {step > 0 && <button type="button" className="w-full min-h-11 rounded-xl border p-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-[#6D4AFF]" onClick={() => { setStep(step - 1); setErrors({}); }}>Back</button>}
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-[16px] bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-[#6D4AFF]"
          >
            {step === 2 ? 'Start my journey' : 'Continue'}
          </button>
        </form>
      </main>
    </div>
  );
}
