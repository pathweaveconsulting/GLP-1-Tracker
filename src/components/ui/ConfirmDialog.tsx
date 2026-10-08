import React, { useId, useRef } from 'react';
import { useDialog } from '../../hooks/useDialog';
import { useBackdropClose } from '../../hooks/useBackdropClose';
import { buttonClass } from '../ds/Button';

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
  const backdrop = useBackdropClose(onCancel);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/45 sm:items-center sm:p-4" {...backdrop}>
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-[18px] border border-line bg-surface p-5 shadow-2xl sm:rounded-[var(--radius-panel)] sm:p-6"
      >
        <h2 id={titleId} className="text-lg font-semibold leading-7 text-ink">{title}</h2>
        <div id={descId} className="mt-2 text-sm leading-6 text-muted">{description}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className={buttonClass('secondary')}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={buttonClass(destructive ? 'danger' : 'primary')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
