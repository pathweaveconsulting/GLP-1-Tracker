import React, { useId, useState } from 'react';
import { Syringe, Check, Clock, Sparkles } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Medication } from '../../types';
import { INJECTION_SITES_ABDOMEN, INJECTION_SITES_OTHER, getRecommendedNextSite } from '../../lib/glp1Utils';
import { MEDICATION_OPTIONS, defaultDoseAmount, doseWarning, medicationInfo } from '../../lib/medications';
import { localDateTimeToIso, nowLocalTimeString, parseDateOnly, todayLocalDateString } from '../../lib/dates';
import { lastDoseOf } from '../../lib/insights';
import { Modal } from '../ui/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const field = 'w-full px-3.5 py-2.5 rounded-[16px] border border-[#E5E7EB] bg-[#F8F9FC] text-[#111827] text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none';
const label = 'block text-xs font-semibold text-[#667085] mb-1.5';

function SiteGrid({ sites, site, lastSite, recommended, onPick }: { sites: string[]; site: string; lastSite?: string; recommended: string; onPick: (s: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
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
            className={`text-left px-3 py-2 rounded-[16px] text-xs font-semibold border transition-all flex items-center justify-between ${
              isSelected ? 'bg-purple-100 border-purple-500 text-purple-900 shadow-xs' : isRecommended ? 'bg-purple-50/70 border-purple-200 text-[#4C1D95]' : 'bg-white border-[#E5E7EB] text-[#344054] hover:bg-[#F1F5F9]'
            }`}
          >
            <span className="truncate">{s}</span>
            {isLast && <span className="text-[10px] text-[#98A2B3] font-normal italic ml-1 shrink-0">(last site)</span>}
            {isRecommended && !isLast && <span className="text-[10px] text-[#6D4AFF] font-semibold ml-1 shrink-0">(suggested next)</span>}
          </button>
        );
      })}
    </div>
  );
}

function DoseForm({ onClose, onSuccess }: Omit<Props, 'isOpen'>) {
  const { addDose, settings, doses } = useStore();
  const uid = useId();
  const today = todayLocalDateString();
  const lastDose = lastDoseOf(doses);
  const recommendedNextSite = getRecommendedNextSite(lastDose?.site, settings.customSites);

  const [medication, setMedication] = useState<Medication>(settings.medication);
  const [amount, setAmount] = useState<string>(() => {
    const a = defaultDoseAmount(settings.medication, doses);
    return a == null ? '' : String(a);
  });
  const [dateStr, setDateStr] = useState<string>(today);
  const [timeStr, setTimeStr] = useState<string>(nowLocalTimeString());
  const [site, setSite] = useState<string>(recommendedNextSite);
  const [painLevel, setPainLevel] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [confirmed, setConfirmed] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customSite, setCustomSite] = useState('');
  const [errors, setErrors] = useState<{ amount?: string; when?: string; confirm?: string }>({});

  const info = medicationInfo(medication);
  const amountNum = amount.trim() === '' ? NaN : Number(amount);
  const warning = doseWarning(medication, amountNum);

  const changeMedication = (m: Medication) => {
    setMedication(m);
    const a = defaultDoseAmount(m, doses);
    setAmount(a == null ? '' : String(a));
    setConfirmed(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (warning?.level === 'error') next.amount = warning.text;
    if (!parseDateOnly(dateStr) || !/^\d{2}:\d{2}$/.test(timeStr)) next.when = 'Enter a valid date and time.';
    else if (new Date(localDateTimeToIso(dateStr, timeStr)).getTime() > Date.now() + 5 * 60_000) next.when = 'The injection time can’t be in the future.';
    if (warning?.requiresConfirmation && !confirmed) next.confirm = 'Please confirm you’ve double-checked this amount.';
    setErrors(next);
    if (Object.keys(next).length) return;

    addDose({ medication, amountMg: amountNum, date: localDateTimeToIso(dateStr, timeStr), site, painLevel, notes });
    onSuccess?.();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor={`${uid}-med`} className={label}>Medication</label>
        <select id={`${uid}-med`} value={medication} onChange={(e) => changeMedication(e.target.value as Medication)} className={field}>
          {MEDICATION_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        {info.investigational && <p className="text-xs text-amber-800 mt-1">{info.notes}</p>}
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
          <div className="flex flex-wrap gap-1.5 mt-2" role="group" aria-label={`Standard ${medication} dose steps`}>
            {info.doseSteps.map((step) => (
              <button
                key={step}
                type="button"
                aria-pressed={amountNum === step}
                onClick={() => { setAmount(String(step)); setConfirmed(false); }}
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${amountNum === step ? 'bg-[#6D4AFF] text-white border-[#6D4AFF]' : 'bg-white text-[#344054] border-[#E5E7EB] hover:bg-[#F8F9FC]'}`}
              >
                {step} mg
              </button>
            ))}
          </div>
        )}
        <div id={`${uid}-amt-help`} className="mt-1.5 space-y-1">
          <p className="text-[11px] text-[#98A2B3]">Log the amount your prescriber told you to use. We never suggest a dose.</p>
          {warning && warning.level !== 'error' && (
            <p className={`text-xs rounded-[12px] px-3 py-2 ${warning.level === 'caution' ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-slate-50 text-slate-700 border border-slate-200'}`}>{warning.text}</p>
          )}
          {errors.amount && <p role="alert" className="text-xs text-rose-600">{errors.amount}</p>}
        </div>
        {warning?.requiresConfirmation && (
          <div className="mt-2">
            <label className="flex items-start gap-2 text-xs text-[#344054]">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-[#D0D5DD]" />
              <span>I’ve double-checked this amount against my prescription.</span>
            </label>
            {errors.confirm && <p role="alert" className="text-xs text-rose-600 mt-1">{errors.confirm}</p>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${uid}-date`} className={label}>Date</label>
          <input id={`${uid}-date`} type="date" max={today} value={dateStr} onChange={(e) => setDateStr(e.target.value)} className={field} aria-invalid={errors.when ? true : undefined} />
        </div>
        <div>
          <label htmlFor={`${uid}-time`} className={`${label} flex items-center gap-1`}><Clock className="w-3 h-3 text-[#6D4AFF]" aria-hidden="true" /> Time</label>
          <input id={`${uid}-time`} type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} className={field} aria-invalid={errors.when ? true : undefined} />
        </div>
        {errors.when && <p role="alert" className="text-xs text-rose-600 sm:col-span-2 -mt-1">{errors.when}</p>}
      </div>

      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className={`${label} mb-0`} id={`${uid}-site`}>Injection site</span>
          {lastDose?.site && <span className="text-[11px] text-[#6D4AFF] font-semibold flex items-center gap-1"><Sparkles className="w-3 h-3" aria-hidden="true" /> Rotation suggested</span>}
        </div>
        <div role="group" aria-labelledby={`${uid}-site`} className="bg-[#F8F9FC] rounded-[16px] p-3 border border-[#E5E7EB] space-y-3 max-h-56 overflow-y-auto">
          <div>
            <span className="text-[11px] font-semibold text-[#98A2B3] block mb-2">Abdomen</span>
            <SiteGrid sites={INJECTION_SITES_ABDOMEN} site={site} lastSite={lastDose?.site} recommended={recommendedNextSite} onPick={setSite} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-[#98A2B3] block mb-2">Other sites</span>
            <SiteGrid sites={[...INJECTION_SITES_OTHER, ...(settings.customSites ?? [])]} site={site} lastSite={lastDose?.site} recommended={recommendedNextSite} onPick={setSite} />
          </div>
          {!customOpen ? (
            <button type="button" onClick={() => setCustomOpen(true)} className="w-full py-1.5 text-xs text-[#6D4AFF] font-semibold hover:underline text-left px-1">+ Add a custom site</button>
          ) : (
            <div className="flex gap-2 pt-1">
              <input type="text" aria-label="Custom injection site" placeholder="e.g. Upper hip" value={customSite} onChange={(e) => setCustomSite(e.target.value)} className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#D0D5DD] bg-white" />
              <button type="button" onClick={() => { if (customSite.trim()) { setSite(customSite.trim()); setCustomOpen(false); setCustomSite(''); } }} className="px-3 py-1.5 bg-[#6D4AFF] text-white rounded-lg text-xs font-semibold">Add</button>
            </div>
          )}
        </div>
        <p className="text-[11px] text-[#98A2B3] mt-1">Selected: {site}</p>
      </div>

      <div>
        <label htmlFor={`${uid}-pain`} className={label}>Injection-site discomfort (0 – 10)</label>
        <div className="flex items-center gap-3">
          <input id={`${uid}-pain`} type="range" min="0" max="10" value={painLevel} onChange={(e) => setPainLevel(parseInt(e.target.value, 10))} className="w-full accent-purple-600" />
          <span className="text-sm font-semibold text-[#6D4AFF] w-6 text-center" aria-hidden="true">{painLevel}</span>
        </div>
      </div>

      <div>
        <label htmlFor={`${uid}-notes`} className={label}>Notes (optional)</label>
        <textarea id={`${uid}-notes`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did the injection feel?" className="w-full px-3.5 py-2 rounded-[16px] border border-[#E5E7EB] bg-[#F8F9FC] text-[#111827] text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none" />
      </div>

      <div className="pt-2 flex gap-3">
        <button type="button" onClick={onClose} className="flex-1 py-3 px-4 rounded-[16px] border border-[#E5E7EB] text-[#344054] font-semibold text-sm hover:bg-[#F8F9FC] transition-colors">Cancel</button>
        <button type="submit" className="flex-1 py-3 px-4 rounded-[16px] bg-[#6D4AFF] text-white font-semibold text-sm hover:bg-[#5B3FE0] transition-colors shadow-md shadow-purple-200 flex items-center justify-center gap-2">
          <Check className="w-4 h-4" aria-hidden="true" /> Save Dose
        </button>
      </div>
    </form>
  );
}

export function LogDoseModal({ isOpen, onClose, onSuccess }: Props) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Log Shot / Dose"
      subtitle="Record the date, time, medication and injection site"
      widthClass="max-w-lg"
      icon={<div className="w-10 h-10 rounded-[16px] bg-purple-50 flex items-center justify-center text-[#6D4AFF]"><Syringe className="w-5 h-5" aria-hidden="true" /></div>}
    >
      <DoseForm onClose={onClose} onSuccess={onSuccess} />
    </Modal>
  );
}
