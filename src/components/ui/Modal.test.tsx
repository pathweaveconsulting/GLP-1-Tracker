import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Modal } from './Modal';

afterEach(cleanup);

function setup() {
  const onClose = vi.fn();
  render(
    <Modal open onClose={onClose} title="Test">
      <input aria-label="note" />
    </Modal>,
  );
  const dialog = screen.getByRole('dialog');
  return { onClose, dialog, overlay: dialog.parentElement as HTMLElement };
}

describe('R5: backdrop click closes only when the press also began on the backdrop', () => {
  it('a press inside the panel released on the backdrop does not close (typed text is kept)', () => {
    const { onClose, dialog, overlay } = setup();
    fireEvent.mouseDown(dialog);
    fireEvent.mouseUp(overlay);
    fireEvent.click(overlay); // the browser reports the click on the common ancestor
    expect(onClose).not.toHaveBeenCalled();
  });

  it('a press and release on the backdrop closes', () => {
    const { onClose, overlay } = setup();
    fireEvent.mouseDown(overlay);
    fireEvent.mouseUp(overlay);
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('a plain click on the backdrop (no mousedown, e.g. a keyboard or assistive-tech click) still closes', () => {
    const { onClose, overlay } = setup();
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('a click inside the panel never closes', () => {
    const { onClose, dialog } = setup();
    fireEvent.mouseDown(dialog);
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('the Close button still closes', () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('F7: a press that starts and ends inside the panel does not leave a stale flag that blocks a later keyboard/assistive-tech backdrop click', () => {
    const { onClose, dialog, overlay } = setup();
    fireEvent.mouseDown(dialog);
    fireEvent.mouseUp(dialog);
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(overlay); // no mousedown: counts as a backdrop click
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('F7: a drag that starts in the panel and is released on the backdrop still does not close', () => {
    const { onClose, dialog, overlay } = setup();
    fireEvent.mouseDown(dialog);
    fireEvent.mouseUp(overlay);
    fireEvent.click(overlay);
    expect(onClose).not.toHaveBeenCalled();
  });
});
