import * as React from 'react';

/** Honest empty state: says what is missing and what would fill it. Never a zero, a "normal" or an "on track". */
export function EmptyState({ title, children, action }: { title: React.ReactNode; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-dashed border-line bg-canvas px-4 py-5 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-sm text-[13px] leading-5 text-muted">{children}</p>}
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}
