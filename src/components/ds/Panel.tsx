import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * A titled section of a page. Panels are the only "card" in the system: one border, one radius, no shadow stack.
 * `titleAs` keeps the document outline correct (pages own the single h1; panels are h2 by default).
 */
export function Panel({
  title, description, action, titleAs: Title = 'h2', id, className, bodyClassName, children,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  titleAs?: 'h2' | 'h3';
  id?: string;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  const headingId = React.useId();
  return (
    <section
      aria-labelledby={title ? (id ?? headingId) : undefined}
      className={cn('rounded-[var(--radius-panel)] border border-line bg-surface', className)}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
          <div className="min-w-0">
            {title && <Title id={id ?? headingId} className="text-[15px] font-semibold leading-6 text-ink">{title}</Title>}
            {description && <p className="mt-0.5 text-[13px] leading-5 text-muted">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn('px-4 pb-4 pt-3 sm:px-5 sm:pb-5', !title && !action && 'pt-4 sm:pt-5', bodyClassName)}>{children}</div>
    </section>
  );
}
