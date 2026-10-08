import * as React from 'react';

/** The top of every page: optional context line, the page's only h1, a one-sentence purpose and page actions. */
export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-3 sm:items-end">
      <div className="min-w-0 flex-1 basis-48">
        {eyebrow && <p className="text-[13px] font-medium text-muted">{eyebrow}</p>}
        <h1 className="mt-0.5 text-2xl font-semibold tracking-[-0.01em] text-ink sm:text-[28px] sm:leading-9">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
