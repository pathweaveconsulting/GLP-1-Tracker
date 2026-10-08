import React, { useId, useState } from 'react';
import { Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { DoseEvent, Medication } from '../../types';
import { INJECTION_SITES_ABDOMEN, INJECTION_SITES_OTHER, getRecommendedNextSite } from '../../lib/glp1Utils';
import { APPROXIMATE_NOTE, MEDICATION_OPTIONS, defaultDoseAmount, doseWarning, medicationInfo } from '../../lib/medications';
import { dstGapAdjustment, isoToLocalDateString, isoToLocalTimeString, localDateTimeToIso, nowLocalTimeString, parseDateOnly, todayLocalDateString } from '../../lib/dates';
import { lastDoseOf } from '../../lib/insights';
import { similarDose } from '../../lib/duplicates';
import { format } from 'date-fns';
import { Modal } from '../ui/Modal';
import { OtherMedicationNote } from '../OtherMedicationNote';
import { choiceClass, errorClass, FormActions, helpClass, inputClass, labelClass, noteClass } from '../ds';

interface Props {
  isOpen: boolean;
  /** When given, the dialog edits this injection instead of adding a new one. */
  entry?: DoseEvent;
  onClose: () => void;
  onSuccess?: () => void;
  /** Called after an edit is saved, with the record as it was before the edit (for undo). */
  onEdited?: (before: DoseEvent) => void;
}

const field = inputClass();
const label = `${labelClass} mb-1.5`;

function SiteGrid({ sites, site, lastSite, recommended, onPick }: { sites: string[]; site: string; lastSite?: string; recommended: string; onPick: (s: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {sites.map((s) => {
        const isLast = s === lastSite;
        const isRecommended = s === recommended;
        const isSelected = site === s;
        return (
          <button
            key={s}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onPick(s)}
            className={choiceClass(isSelected, 'justify-between text-left')}
          >
            <span className="truncate">{s}</span>
            {isLast && <span className="ml-1 shrink-0 text-xs font-normal text-muted">(last site)</span>}
            {isRecommended && !isLast && <span className="ml-1 shrink-0 text-xs font-medium text-brand">(suggested next)</span>}
          </button>
        );
      })}
    </div>
  );
}

function DoseForm({ entry, onClose, onSuccess, onEdited }: Omit<Props, 'isOpen'>) {
  const { addDose, editDose, settings, doses } = useStore();
  const uid = useId();
  const today = todayLocalDateString();
  const lastDose = lastDoseOf(doses);
  const recommendedNextSite = getRecommendedNextSite(lastDose?.site, settings.customSites);

  // Editing starts from the stored record exactly; untouched fields are written back unchanged.
  const initial = entry
    ? { amount: String(entry.amountMg), date: isoToLocalDateString(entry.date), time: isoToLocalTimeString(entry.date) }
    : null;
  const [medication, setMedication] = useState<Medication>(entry?.medication ?? settings.medication);
  const [amount, setAmount] = useState<string>(() => {
    if (initial) return initial.amount;
    const a = defaultDoseAmount(settings.medication, doses);
    return a == null ? '' : String(a);
  });
  const [dateStr, setDateStr] = useState<string>(initial?.date ?? today);
  const [timeStr, setTimeStr] = useState<string>(initial?.time ?? nowLocalTimeString());
  const [site, setSite] = useState<string>(entry?.site ?? recommendedNextSite);
  const [painLevel, setPainLevel] = useState<number | null>(entry ? entry.painLevel : null); // null = not recorded
  const [notes, setNotes] = useState<string>(entry?.notes ?? '');
  const [staleError, setStaleError] = useState<string>();
  // A possible duplicate is a warning, never a block: the second press of Save, unchanged, saves anyway.
  const [duplicate, setDuplicate] = useState<{ match: DoseEvent; key: string }>();
  const [confirmed, setConfirmed] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customSite, setCustomSite] = useState('');
  const [errors, setErrors] = useState<{ amount?: string; when?: string; confirm?: string }>({});

  const gapTime = dstGapAdjustment(dateStr, timeStr);
  const info = medicationInfo(medication);
  const amountNum = amount.trim() === '' ? NaN : Number(amount);
  const warning = doseWarning(medication, amountNum);

  const changeMedication = (m: Medication) => {
    setMedication(m);
    // When editing, keep the recorded amount; the user decides whether it also needs changing.
    if (!entry) {
      const a = defaultDoseAmount(m, doses);
      setAmount(a == null ? '' : String(a));
    }
    setConfirmed(false);
  };
  const amountUnchanged = !!entry && medication === entry.medication && amount.trim() === initial!.amount;
  const formKey = `${medication}|${amount.trim()}|${dateStr}|${timeStr}`;
  const warnDuplicate = duplicate?.key === formKey ? duplicate.match : undefined;
  const whenUnchanged = !!entry && dateStr === initial!.date && timeStr === initial!.time;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    // An edit that leaves medication and amount alone is not re-checked: the user already saved that amount.
    if (!amountUnchanged && warning?.level === 'error') next.amount = warning.text;
    if (!whenUnchanged) {
      if (!parseDateOnly(dateStr) || !/^\d{2}:\d{2}$/.test(timeStr)) next.when = 'Enter a valid date and time.';
      else if (new Date(localDateTimeToIso(dateStr, timeStr)).getTime() > Date.now() + 5 * 60_000) next.when = 'The injection time can’t be in the future.';
    }
    if (!amountUnchanged && warning?.requiresConfirmation && !confirmed) next.confirm = 'Please confirm you’ve double-checked this amount.';
    setErrors(next);
    if (Object.keys(next).length) return;

    if (!entry) {
      const candidate = { medication, amountMg: amountNum, date: localDateTimeToIso(dateStr, timeStr), site, painLevel, notes };
      const match = similarDose(doses, candidate);
      if (match && !warnDuplicate) { setDuplicate({ match, key: formKey }); return; }
      addDose(candidate);
      onSuccess?.();
      onClose();
      return;
    }
    const fields = {
      medication,
      amountMg: amountUnchanged ? entry.amountMg : amountNum,
      date: whenUnchanged ? entry.date : localDateTimeToIso(dateStr, timeStr),
      site,
      painLevel,
      notes,
    };
    const { id: _id, ...before } = entry;
    if (JSON.stringify({ ...before, ...fields }) === JSON.stringify(before)) { onClose(); return; }
    // Only a change to what, how much or when can create a new duplicate; a notes or site correction cannot.
    const match = amountUnchanged && whenUnchanged ? undefined : similarDose(doses, { ...before, ...fields }, entry.id);
    if (match && !warnDuplicate) { setDuplicate({ match, key: formKey }); return; }
    if (!editDose(entry, { ...before, ...fields })) {
      setStaleError('This injection changed or was removed after you opened it. Nothing was saved. Close this window and review it again.');
      return;
    }
    onEdited?.(entry);
    onSuccess?.();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor={`${uid}-med`} className={label}>Medication</label>
        <select id={`${uid}-med`} value={medication} onChange={(e) => changeMedication(e.target.value as Medication)} className={field}>
          {MEDICATION_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <p className={`mt-1.5 ${helpClass}`}>Weekly injection models only. For oral semaglutide, including Wegovy tablets or Rybelsus, select Other. Verify your exact product and prescription with your pharmacist.</p>
        <OtherMedicationNote medication={medication} className="mt-2" />
      </div>

      <div>
        <label htmlFor={`${uid}-amt`} className={label}>Dose amount (mg)</label>
        <input
          id={`${uid}-amt`}
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setConfirmed(false); }}
          aria-invalid={errors.amount ? true : undefined}
          aria-describedby={`${uid}-amt-help`}
          className={field}
        />
        {info.doseSteps.length > 0 && (
          <>
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`Standard ${medication} dose steps`}>
            {info.doseSteps.map((step) => (
              <button
                key={step}
                type="button"
                aria-pressed={amountNum === step}
                onClick={() => { setAmount(String(step)); setConfirmed(false); }}
                className={choiceClass(amountNum === step, 'tabular-nums')}
              >
                {step} mg
              </button>
            ))}
          </div>
          <p className={`mt-1.5 ${helpClass}`}>Standard steps are {APPROXIMATE_NOTE}.</p>
          </>
        )}
        <div id={`${uid}-amt-help`} className="mt-1.5 space-y-1">
          <p className={helpClass}>Log the amount your prescriber told you to use. We never suggest a dose.</p>
          {warning && warning.level !== 'error' && (
            <p className={noteClass(warning.level === 'caution' ? 'caution' : 'neutral')}>{warning.text}</p>
          )}
          {errors.amount && <p role="alert" className={errorClass}>{errors.amount}</p>}
        </div>
        {warning?.requiresConfirmation && (
          <div className="mt-2">
            <label className="flex min-h-11 items-start gap-2.5 text-sm text-ink">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded border-line-strong accent-brand" />
              <span>I’ve double-checked this amount against my prescription.</span>
            </label>
            {errors.confirm && <p role="alert" className={`mt-1 ${errorClass}`}>{errors.confirm}</p>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${uid}-date`} className={label}>Date</label>
          <input id={`${uid}-date`} type="date" max={today} value={dateStr} onChange={(e) => setDateStr(e.target.value)} className={field} aria-invalid={errors.when ? true : undefined} />
        </div>
        <div>
          <label htmlFor={`${uid}-time`} className={label}>Time</label>
          <input id={`${uid}-time`} type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} className={field} aria-invalid={errors.when ? true : undefined} />
        </div>
        {gapTime && <p role="status" className={`sm:col-span-2 ${helpClass}`}>That time doesn&apos;t exist on this date; saved as {gapTime}.</p>}
        {errors.when && <p role="alert" className={`sm:col-span-2 ${errorClass}`}>{errors.when}</p>}
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className={labelClass} id={`${uid}-site`}>Injection site</span>
          {lastDose?.site && <span className={helpClass}>Rotation suggested</span>}
        </div>
        <div role="group" aria-labelledby={`${uid}-site`} className="max-h-64 space-y-3 overflow-y-auto rounded-[var(--radius-control)] border border-line bg-canvas p-3">
          <div>
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">Abdomen</span>
            <SiteGrid sites={INJECTION_SITES_ABDOMEN} site={site} lastSite={lastDose?.site} recommended={recommendedNextSite} onPick={setSite} />
          </div>
          <div>
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">Other sites</span>
            <SiteGrid sites={[...INJECTION_SITES_OTHER, ...(settings.customSites ?? [])]} site={site} lastSite={lastDose?.site} recommended={recommendedNextSite} onPick={setSite} />
          </div>
          {!customOpen ? (
            <button type="button" onClick={() => setCustomOpen(true)} className="min-h-11 px-1 text-left text-sm font-semibold text-brand hover:underline">+ Add a custom site</button>
          ) : (
            <div className="flex gap-2 pt-1">
              <input type="text" aria-label="Custom injection site" placeholder="e.g. Upper hip" value={customSite} onChange={(e) => setCustomSite(e.target.value)} className={inputClass('flex-1')} />
              <button type="button" onClick={() => { if (customSite.trim()) { setSite(customSite.trim()); setCustomOpen(false); setCustomSite(''); } }} className="min-h-11 rounded-[var(--radius-control)] bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong">Add</button>
            </div>
          )}
        </div>
        <p className={`mt-1.5 ${helpClass}`}>Selected: {site}</p>
      </div>

      <div>
        <label htmlFor={`${uid}-pain`} className={label}>Injection-site discomfort (optional)</label>
        <select
          id={`${uid}-pain`}
          value={painLevel == null ? '' : String(painLevel)}
          onChange={(e) => setPainLevel(e.target.value === '' ? null : parseInt(e.target.value, 10))}
          className={field}
        >
          <option value="">Not recorded</option>
          <option value="0">0 – none</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}{n === 10 ? ' – worst' : ''}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor={`${uid}-notes`} className={label}>Notes (optional)</label>
        <textarea id={`${uid}-notes`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did the injection feel?" className={field} />
      </div>

      {warnDuplicate && (
        <p role="alert" className={noteClass('caution')}>
          You already recorded {warnDuplicate.amountMg} mg {warnDuplicate.medication} on {format(new Date(warnDuplicate.date), 'EEE d MMM')} at {format(new Date(warnDuplicate.date), 'h:mm a')}. If this is a separate injection, select Save anyway; otherwise cancel.
        </p>
      )}
      {staleError && <p role="alert" className={noteClass('danger')}>{staleError}</p>}
      <FormActions onCancel={onClose} submitLabel={warnDuplicate ? 'Save anyway' : entry ? 'Save changes' : 'Save Dose'} submitIcon={<Check className="h-4 w-4" aria-hidden="true" />} />
    </form>
  );
}

export function LogDoseModal({ isOpen, entry, onClose, onSuccess, onEdited }: Props) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={entry ? 'Edit injection' : 'Log shot or dose'}
      subtitle={entry ? 'Correct the medication, amount, time, site or notes of this injection' : 'Medication, amount, date, time and injection site'}
      widthClass="max-w-lg"
    >
      <DoseForm key={entry?.id ?? 'new'} entry={entry} onClose={onClose} onSuccess={onSuccess} onEdited={onEdited} />
    </Modal>
  );
}
