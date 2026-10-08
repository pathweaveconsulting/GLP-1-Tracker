import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * One labelled figure. `value` is shown as given; callers pass "–" when nothing was recorded, never a made-up number.
 * Figures use tabular numerals so columns of numbers line up.
 */
export function Stat({ label, value, unit, note, tone = 'ink', size = 'md', className }: {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  note?: React.ReactNode;
  tone?: 'ink' | 'positive' | 'caution';
  size?: 'md' | 'lg';
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-[13px] leading-5 text-muted">{label}</dt>
      <dd className="mt-1">
        <span className={cn(
          'font-semibold tabular-nums tracking-[-0.01em]',
          size === 'lg' ? 'text-[28px] leading-8' : 'text-xl leading-7',
          tone === 'ink' && 'text-ink', tone === 'positive' && 'text-positive', tone === 'caution' && 'text-caution',
        )}>{value}</span>
        {unit && <span className="ml-1 text-[13px] text-muted">{unit}</span>}
        {note && <span className="mt-0.5 block text-[13px] leading-5 text-subtle">{note}</span>}
      </dd>
    </div>
  );
}
