import React, { useId, useRef } from 'react';
import { useDialog } from '../../hooks/useDialog';

interface Props {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Destructive actions are styled in red. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Accessible replacement for window.confirm(). Escape cancels; focus starts on Cancel (the safe choice). */
export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel = 'Cancel', destructive, onConfirm, onCancel }: Props) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useDialog(open, onCancel, panelRef, cancelRef);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onCancel}>
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-md rounded-[24px] p-6 shadow-2xl border border-[#E5E7EB]"
      >
        <h2 id={titleId} className="text-lg font-semibold text-[#111827]">{title}</h2>
        <div id={descId} className="mt-2 text-sm text-muted leading-relaxed">{description}</div>
        <div className="mt-6 flex gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-[16px] border border-[#E5E7EB] text-[#344054] font-semibold text-sm hover:bg-[#F8F9FC] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 px-4 rounded-[16px] text-white font-semibold text-sm transition-colors ${destructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-900 hover:bg-slate-800'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
