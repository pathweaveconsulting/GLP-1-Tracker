import React, { useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useDialog } from '../../hooks/useDialog';
import { useBackdropClose } from '../../hooks/useBackdropClose';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional one-line description shown under the title. */
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Tailwind max-width class for the panel. */
  widthClass?: string;
  dark?: boolean;
}

/** Accessible modal dialog: role="dialog", labelled, Escape / backdrop / close button, focus trap and restore. */
export function Modal({ open, onClose, title, subtitle, icon, children, widthClass = 'max-w-md', dark }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const backdrop = useBackdropClose(onClose);
  useDialog(open, onClose, panelRef);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 sm:items-center sm:p-4"
      {...backdrop}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[18px] border p-5 shadow-2xl sm:max-h-[88vh] sm:rounded-[var(--radius-panel)] sm:p-6 ${widthClass} ${dark ? 'border-slate-800 bg-slate-900 text-white' : 'border-line bg-surface'}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          data-dialog-close
          className={`absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] transition-colors ${dark ? 'text-slate-300 hover:bg-slate-800' : 'text-muted hover:bg-sunken hover:text-ink'}`}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="mb-5 flex items-center gap-3 pr-12">
          {icon}
          <div>
            <h2 id={titleId} className={`text-lg font-semibold leading-7 ${dark ? 'text-white' : 'text-ink'}`}>{title}</h2>
            {subtitle && <p className={`text-[13px] leading-5 ${dark ? 'text-slate-300' : 'text-muted'}`}>{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
