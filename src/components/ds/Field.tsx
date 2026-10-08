import * as React from 'react';
import clsx from 'clsx';

/** One look for every text input, select and textarea: visible 3:1 border, 44px tall, brand focus outline. */
export const inputClass = (className?: string) =>
  clsx(
    'block w-full min-h-11 rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 py-2 text-[15px] text-ink',
    'aria-[invalid=true]:border-danger disabled:bg-sunken disabled:text-muted',
    className,
  );

export const labelClass = 'block text-sm font-semibold text-ink';
export const helpClass = 'text-[13px] text-muted';
export const errorClass = 'text-[13px] font-medium text-danger';

/** Pressed-state chip used for single-choice groups (dose steps, injection sites, severity, ranges). */
export const choiceClass = (selected: boolean, className?: string) =>
  clsx(
    'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[var(--radius-control)] border px-3 text-sm font-semibold transition-colors sm:min-h-9',
    selected ? 'border-brand bg-brand-soft text-brand-strong ring-1 ring-brand' : 'border-line-strong bg-surface text-ink-2 hover:bg-sunken',
    className,
  );

/** Tinted note box. Tone is also carried by wording; colour is never the only signal. */
export const noteClass = (tone: 'neutral' | 'caution' | 'danger' | 'positive' | 'info' = 'neutral', className?: string) =>
  clsx(
    'rounded-[var(--radius-control)] border-l-4 px-3 py-2 text-[13px]',
    tone === 'neutral' && 'border-line-strong bg-sunken text-ink-2',
    tone === 'caution' && 'border-caution bg-caution-soft text-ink',
    tone === 'danger' && 'border-danger bg-danger-soft text-ink',
    tone === 'positive' && 'border-positive bg-positive-soft text-ink',
    tone === 'info' && 'border-brand bg-brand-soft text-ink',
    className,
  );

interface FieldProps {
  label: React.ReactNode;
  htmlFor: string;
  help?: React.ReactNode;
  helpId?: string;
  error?: string;
  errorId?: string;
  className?: string;
  children: React.ReactNode;
}

/** Label, control, optional help and error in a fixed order. The control itself sets aria-describedby. */
export function Field({ label, htmlFor, help, helpId, error, errorId, className, children }: FieldProps) {
  return (
    <div className={clsx('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className={labelClass}>{label}</label>
      {children}
      {help && <p id={helpId} className={helpClass}>{help}</p>}
      {error && <p id={errorId} role="alert" className={errorClass}>{error}</p>}
    </div>
  );
}

/** Cancel + primary submit row used at the foot of every form dialog. */
export function FormActions({ onCancel, submitLabel, submitIcon }: { onCancel: () => void; submitLabel: string; submitIcon?: React.ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
      <button type="button" onClick={onCancel} className={clsx(btn, 'border border-line-strong bg-surface text-ink hover:bg-sunken')}>Cancel</button>
      <button type="submit" className={clsx(btn, 'bg-brand text-white hover:bg-brand-strong')}>{submitIcon}{submitLabel}</button>
    </div>
  );
}
const btn = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] px-4 text-sm font-semibold transition-colors sm:min-w-28';
