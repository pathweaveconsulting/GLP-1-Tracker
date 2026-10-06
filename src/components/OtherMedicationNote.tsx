import { Info } from 'lucide-react';
import { NO_ESTIMATE_TEXT, OTHER_MEDICATION_NOTE, medicationInfo } from '../lib/medications';
import type { Medication } from '../types';

/**
 * Explains what the app can't do for medications it doesn't model: "Other" (including oral tablets such as Rybelsus)
 * and the investigational Retatrutide. Renders nothing for the tracked weekly drugs.
 */
export function OtherMedicationNote({ medication, className = '' }: { medication: Medication | null | undefined; className?: string }) {
  if (!medication) return null;
  const info = medicationInfo(medication);
  if (info.modelled) return null;
  const text = info.investigational ? `${NO_ESTIMATE_TEXT} ${info.notes ?? ''}`.trim() : OTHER_MEDICATION_NOTE;
  return (
    <p className={`flex gap-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-[12px] px-3 py-2 ${className}`}>
      <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
      <span>{text}</span>
    </p>
  );
}
