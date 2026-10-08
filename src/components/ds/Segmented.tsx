import clsx from 'clsx';

/** View switcher: a labelled group of pressed-state buttons. Selection is shown by fill, weight and aria-pressed. */
export function Segmented<T extends string>({ label, value, options, onChange, className }: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={clsx('inline-flex max-w-full overflow-x-auto rounded-[var(--radius-control)] border border-line bg-sunken p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'min-h-10 whitespace-nowrap rounded-[8px] px-3 text-sm transition-colors sm:min-h-9',
            value === o.value ? 'bg-surface font-semibold text-ink shadow-[0_0_0_1px_var(--color-line-strong)]' : 'font-medium text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
