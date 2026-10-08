import { Link } from 'react-router-dom';
import { AlertTriangle, FlaskConical, ShieldAlert } from 'lucide-react';
import { useStore } from '../store/useStore';
import { LEAFLET_LINE, MEDICATION_INFO } from '../lib/medications';
import type { Medication } from '../types';

/** Shown with the list so it is never read as complete. Clinical content needs human review. */
export const EXAMPLES_NOT_EXHAUSTIVE = 'These are examples, not a complete list. Follow your medication leaflet and call a healthcare professional or emergency services if you are worried.';

export const RED_FLAGS: readonly string[] = [
  'Severe or persistent belly pain, with or without vomiting',
  'Vomiting that won’t stop, or signs of dehydration (very dry mouth, dizziness, very little urine)',
  'Signs of an allergic reaction: swelling of the face, lips, tongue or throat, trouble breathing, or a widespread rash',
  'Yellowing of the skin or eyes',
  'A new lump in the neck, hoarseness, or trouble swallowing',
  'Signs of low blood sugar (shakiness, sweating, confusion, a racing heart), especially if you also take insulin or a sulfonylurea',
  'Thoughts of harming yourself',
];

interface Props {
  variant?: 'full' | 'compact';
  /** Override the medication used to decide on the investigational warning (e.g. during onboarding). */
  medication?: Medication;
  className?: string;
  /** Onboarding is outside the router and shows the complete notice at review. */
  showHelpLink?: boolean;
}

/** Shared safety guidance. "full" lists red-flag symptoms and missed-dose guidance; "compact" is a one-line footer. */
export function SafetyNotice({ variant = 'full', medication, className = '', showHelpLink = true }: Props) {
  const settingsMed = useStore((s) => s.settings.medication);
  const hasRetatrutideDose = useStore((s) => s.doses.some((d) => d.medication === 'Retatrutide'));
  const med = medication ?? settingsMed;
  const investigational = med === 'Retatrutide' || (!medication && hasRetatrutideDose);

  if (variant === 'compact') {
    return (
      <p className={`text-[11px] text-muted leading-relaxed ${className}`} data-testid="safety-compact">
        <ShieldAlert className="inline w-3 h-3 mr-1 -mt-0.5 text-subtle" aria-hidden="true" />
        Not medical advice. Severe or lasting belly pain, repeated vomiting, an allergic reaction or thoughts of self-harm need urgent care. {EXAMPLES_NOT_EXHAUSTIVE}{' '}
        {showHelpLink && <Link to="/health#safety" className="text-brand font-semibold hover:underline">When to get help</Link>}
      </p>
    );
  }

  return (
    <section id="safety" aria-labelledby="safety-heading" className={`rounded-[var(--radius-panel)] border border-caution/40 border-l-4 border-l-caution bg-caution-soft p-4 text-ink sm:p-5 ${className}`} data-testid="safety-full">
      <h2 id="safety-heading" className="flex items-center gap-2 text-[15px] font-semibold">
        <AlertTriangle className="w-4 h-4" aria-hidden="true" /> When to get help
      </h2>
      <p className="mt-2 text-sm leading-6">
        Contact your prescriber or get urgent medical care (call your local emergency number if it is severe) if you notice any of these:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
        {RED_FLAGS.map((f) => <li key={f}>{f}</li>)}
      </ul>
      <p className="mt-2 text-sm font-medium leading-6">{EXAMPLES_NOT_EXHAUSTIVE}</p>

      <h3 className="mt-4 text-sm font-semibold">If you miss a dose</h3>
      <p className="mt-1 text-sm leading-6">
        Check the instructions for your medication or ask your prescriber or pharmacist. Never take a double dose to catch up.
        {' '}{MEDICATION_INFO[med]?.missedDoseNote}
      </p>
      {!MEDICATION_INFO[med]?.missedDoseNote.includes(LEAFLET_LINE) && (
        <p className="mt-1 text-sm leading-6"><strong>{LEAFLET_LINE}</strong></p>
      )}

      {investigational && (
        <div className="mt-4 rounded-[var(--radius-control)] bg-white/70 border border-caution/40 p-3 text-xs leading-relaxed flex gap-2">
          <FlaskConical className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <p><strong>Retatrutide is investigational.</strong> It is not an approved medicine, there are no approved doses, and this app can’t tell you what is safe. Use it only as directed by a study team or prescriber.</p>
        </div>
      )}

      <p className="mt-4 text-[13px] text-ink-2">This app is a personal log and a simplified explainer. It is not medical advice and does not replace your care team.</p>
    </section>
  );
}
