import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

afterEach(cleanup);

function setup() {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();
  render(<ConfirmDialog open title="Erase?" description="Sure?" confirmLabel="Erase" onConfirm={onConfirm} onCancel={onCancel} />);
  const dialog = screen.getByRole('alertdialog');
  return { onCancel, onConfirm, dialog, overlay: dialog.parentElement as HTMLElement };
}

describe('RV10: ConfirmDialog guards the press origin like Modal', () => {
  it('a press inside the panel released on the backdrop does not cancel', () => {
    const { onCancel, dialog, overlay } = setup();
    fireEvent.mouseDown(dialog);
    fireEvent.mouseUp(overlay);
    fireEvent.click(overlay);
    expect(onCancel).not.toHaveBeenCalled();
  });
  it('a press and release on the backdrop cancels', () => {
    const { onCancel, overlay } = setup();
    fireEvent.mouseDown(overlay);
    fireEvent.click(overlay);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
  it('a click with no mousedown (keyboard / assistive tech) still cancels', () => {
    const { onCancel, overlay } = setup();
    fireEvent.click(overlay);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
  it('Escape still cancels', async () => {
    const { onCancel } = setup();
    await userEvent.setup().keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
  it('the buttons still work and a click inside the panel does nothing', async () => {
    const { onCancel, onConfirm, dialog } = setup();
    fireEvent.mouseDown(dialog);
    fireEvent.click(dialog);
    expect(onCancel).not.toHaveBeenCalled();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Erase' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
