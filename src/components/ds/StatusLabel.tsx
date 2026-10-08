import * as React from 'react';
import { CheckCircle2, Circle, AlertCircle, MinusCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export type Status = 'done' | 'open' | 'attention' | 'none';

const ICONS = { done: CheckCircle2, open: Circle, attention: AlertCircle, none: MinusCircle };

/** A status always carries words and a distinct icon shape, so it never depends on colour alone. */
export function StatusLabel({ status, children, className }: { status: Status; children: React.ReactNode; className?: string }) {
  const Icon = ICONS[status];
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-[13px] font-medium leading-5',
      status === 'done' && 'text-positive', status === 'open' && 'text-muted',
      status === 'attention' && 'text-caution', status === 'none' && 'text-subtle',
      className,
    )}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </span>
  );
}
