import type React from 'react';
import { useRef } from 'react';

/**
 * Props for a dialog's backdrop element so that it closes only when the press BEGAN on the backdrop as well as ending
 * there. A drag that starts inside the panel (selecting text, say) and is released over the backdrop must not close it.
 * A click with no preceding mousedown (keyboard or assistive technology) still counts as a backdrop click.
 */
export function useBackdropClose(onClose: () => void) {
  const pressOnBackdrop = useRef<boolean | null>(null);
  return {
    onMouseDown: (e: React.MouseEvent<HTMLElement>) => {
      pressOnBackdrop.current = e.target === e.currentTarget;
    },
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      const closes = e.target === e.currentTarget && pressOnBackdrop.current !== false;
      pressOnBackdrop.current = null;
      if (closes) onClose();
    },
  };
}
