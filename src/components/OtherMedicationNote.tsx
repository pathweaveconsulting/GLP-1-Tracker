import React from 'react';
import { Info } from 'lucide-react';
import { OTHER_MEDICATION_NOTE } from '../lib/medications';
import type { Medication } from '../types';

/** Explains what the app can't do for "Other" medications. Renders nothing for the tracked weekly drugs. */
export function OtherMedicationNote({ medication, className = '' }: { medication: Medication | null | undefined; className?: string }) {
  if (medication !== 'Other') return null;
  return (
    <p className={`flex gap-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-[12px] px-3 py-2 ${className}`}>
      <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
      <span>{OTHER_MEDICATION_NOTE}</span>
    </p>
  );
}
