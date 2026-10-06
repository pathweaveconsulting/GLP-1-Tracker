import { RefObject, useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Open dialogs, oldest first. Only the last one (the topmost) reacts to Escape and Tab. */
const dialogStack: symbol[] = [];

const FIELD = 'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])';

/** First form field if there is one; otherwise the first control that is not the dialog's own close button. */
function defaultTarget(container: HTMLElement | null): HTMLElement | null {
  if (!container) return null;
  return (
    container.querySelector<HTMLElement>(FIELD) ??
    Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).find((el) => !el.hasAttribute('data-dialog-close')) ??
    container.querySelector<HTMLElement>(FOCUSABLE) ??
    container
  );
}

/**
 * Shared dialog behaviour: Escape closes (the topmost dialog only), Tab stays inside the dialog, focus moves in on
 * open (to `initialFocus` when given, else the first form field) and returns to the previously focused element on close.
 */
export function useDialog(
  open: boolean,
  onClose: () => void,
  containerRef: RefObject<HTMLElement | null>,
  initialFocus?: RefObject<HTMLElement | null>,
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const container = containerRef.current;

    const me = Symbol('dialog');
    dialogStack.push(me);
    const isTop = () => dialogStack[dialogStack.length - 1] === me;

    const target = initialFocus?.current ?? defaultTarget(container);
    target?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isTop()) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !container) return;
      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !container.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !container.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const i = dialogStack.indexOf(me);
      if (i !== -1) dialogStack.splice(i, 1);
      previouslyFocused?.focus?.();
    };
  }, [open, containerRef, initialFocus]);
}
