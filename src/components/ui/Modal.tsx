import React, { useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useDialog } from '../../hooks/useDialog';

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
  // Where the current press began. A press that began inside the panel and ended on the backdrop (a text-selection
  // drag) must not close the dialog. null = no mousedown seen (keyboard / assistive-tech click), which still closes.
  const pressOnBackdrop = useRef<boolean | null>(null);
  useDialog(open, onClose, panelRef);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={(e) => { pressOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => {
        const closes = e.target === e.currentTarget && pressOnBackdrop.current !== false;
        pressOnBackdrop.current = null;
        if (closes) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${widthClass} rounded-[24px] p-6 shadow-2xl border relative max-h-[90vh] overflow-y-auto ${dark ? 'bg-slate-900 text-white border-slate-800' : 'bg-white border-[#E5E7EB]'}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          data-dialog-close
          className={`absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${dark ? 'bg-slate-800 hover:bg-slate-700 text-subtle' : 'bg-[#F1F5F9] hover:bg-[#E5E7EB] text-muted'}`}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-3 mb-5 pr-10">
          {icon}
          <div>
            <h2 id={titleId} className={`text-xl font-semibold ${dark ? 'text-white' : 'text-[#111827]'}`}>{title}</h2>
            {subtitle && <p className={`text-xs ${dark ? 'text-subtle' : 'text-muted'}`}>{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
