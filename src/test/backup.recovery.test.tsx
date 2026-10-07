import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from '../pages/Settings';
import { ToastProvider } from '../components/ui/Toast';
import { useStore } from '../store/useStore';
import { seedStore } from './fixtures';
import { createBackup } from '../lib/backup';
import { downloadTextFile } from '../lib/csv';

function snapshot() {
  const { settings, doses, weights, effects } = useStore.getState();
  return { settings, doses, weights, effects };
}
function openSettings() {
  render(<ToastProvider><Settings /></ToastProvider>);
  return userEvent.setup();
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('backup recovery failures', () => {
  it('reports an unreadable file, preserves all records, and allows retrying the same file', async () => {
    seedStore('populated', 'kg');
    const before = snapshot();
    const user = openSettings();
    const file = new File(['unavailable'], 'backup.json', { type: 'application/json' });
    const read = vi.fn().mockRejectedValueOnce(new Error('File unavailable')).mockResolvedValueOnce(JSON.stringify(createBackup(before)));
    Object.defineProperty(file, 'text', { value: read });
    const input = screen.getByLabelText('Choose a backup file to restore');
    await user.upload(input, file);
    const error = await screen.findByRole('dialog', { name: 'This backup can’t be restored' });
    expect(within(error).getByRole('alert')).toHaveTextContent('This file could not be read');
    expect(snapshot()).toEqual(before);
    await user.click(within(error).getByRole('button', { name: 'OK' }));
    await user.upload(input, file);
    expect(await screen.findByRole('alertdialog', { name: 'Replace your current data with this backup?' })).toBeInTheDocument();
    expect(read).toHaveBeenCalledTimes(2);
    expect(snapshot()).toEqual(before);
  });

  it('shows a failed export without claiming a download started or changing records', async () => {
    seedStore('populated', 'kg');
    const before = snapshot();
    const user = openSettings();
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => { throw new Error('Blocked'); });
    await user.click(screen.getByRole('button', { name: 'Download a backup (JSON)' }));
    expect(screen.getByRole('status')).toHaveTextContent('Backup download could not start');
    expect(screen.getByRole('status')).not.toHaveTextContent('Backup download started');
    await user.click(screen.getByRole('button', { name: 'Export everything as CSV' }));
    expect(screen.getByRole('status')).toHaveTextContent('CSV export could not start');
    expect(snapshot()).toEqual(before);
  });

  it('cleans up the temporary link and URL when the download click fails', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-failure');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { throw new Error('Blocked'); });
    expect(() => downloadTextFile('backup.json', '{}')).toThrow('Blocked');
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revoke).toHaveBeenCalledWith('blob:test-failure');
  });

  it('restores a valid file only after confirmation and persists every record and unit', async () => {
    seedStore('populated', 'kg');
    const original = snapshot();
    const file = new File([JSON.stringify(createBackup(original))], 'backup.json', { type: 'application/json' });
    seedStore('empty', 'lbs');
    const before = snapshot();
    const user = openSettings();
    await user.upload(screen.getByLabelText('Choose a backup file to restore'), file);
    const dialog = await screen.findByRole('alertdialog', { name: 'Replace your current data with this backup?' });
    expect(snapshot()).toEqual(before);
    await user.click(within(dialog).getByRole('button', { name: 'Replace my data' }));
    expect(snapshot()).toEqual(original);
    await useStore.persist.rehydrate();
    expect(snapshot()).toEqual(original);
  });
});
