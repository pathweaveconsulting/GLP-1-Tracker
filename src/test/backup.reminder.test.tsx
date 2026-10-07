import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { BackupReminder } from '../components/BackupReminder';
import { Settings } from '../pages/Settings';
import { ToastProvider } from '../components/ui/Toast';
import { confirmBackupSaved, parseReminder, reminderDue, snoozeBackupReminder } from '../lib/backupReminder';
import { BACKUP_REMINDER_KEY } from '../store/keys';
import { useStore } from '../store/useStore';
import { seedStore } from './fixtures';

const DAY = 86_400_000;
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('backup reminders', () => {
  it('treats corrupt metadata and future confirmations as unknown; returns after seven days', () => {
    const now = 1_000_000_000;
    expect(reminderDue(parseReminder('broken'), now)).toBe(true);
    expect(reminderDue(parseReminder('{"confirmedAt":"yesterday"}'), now)).toBe(true);
    expect(reminderDue({ confirmedAt: now + 1 }, now)).toBe(true);
    expect(reminderDue({ confirmedAt: now - 7 * DAY + 1 }, now)).toBe(false);
    expect(reminderDue({ confirmedAt: now - 7 * DAY }, now)).toBe(true);
    expect(reminderDue({ snoozedUntil: now + 2 * DAY }, now)).toBe(true);
  });

  it('snoozes for one day, preserves confirmation, and does not report success on blocked storage', () => {
    const now = 1_000_000_000;
    expect(confirmBackupSaved(now - 8 * DAY)).toBe(true);
    expect(snoozeBackupReminder(now)).toBe(true);
    const metadata = parseReminder(localStorage.getItem(BACKUP_REMINDER_KEY));
    expect(metadata.confirmedAt).toBe(now - 8 * DAY);
    expect(reminderDue(metadata, now)).toBe(false);
    expect(reminderDue(metadata, now + DAY)).toBe(true);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
    expect(confirmBackupSaved(now)).toBe(false);
    expect(localStorage.getItem(BACKUP_REMINDER_KEY)).toContain(String(now - 8 * DAY));
  });

  it('appears only with records and hides immediately when a backup is confirmed', async () => {
    seedStore('empty', 'kg');
    render(<MemoryRouter><BackupReminder /></MemoryRouter>);
    expect(screen.queryByRole('region', { name: 'Backup reminder' })).toBeNull();
    act(() => useStore.getState().addWeight({ weightLbs: 220, date: new Date().toISOString() }));
    expect(screen.getByRole('region', { name: 'Backup reminder' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open backup settings' })).toHaveAttribute('href', '/settings#backup');
    act(() => { confirmBackupSaved(); });
    expect(screen.queryByRole('region', { name: 'Backup reminder' })).toBeNull();
  });

  it('a download start never records confirmation; only the explicit saved-file button does', async () => {
    seedStore('populated', 'kg');
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<MemoryRouter><ToastProvider><BackupReminder /><Settings /></ToastProvider></MemoryRouter>);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Download a backup (JSON)' }));
    expect(localStorage.getItem(BACKUP_REMINDER_KEY)).toBeNull();
    expect(screen.getByRole('region', { name: 'Backup reminder' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'I saved my backup file' }));
    expect(parseReminder(localStorage.getItem(BACKUP_REMINDER_KEY)).confirmedAt).toBeGreaterThan(0);
    expect(screen.queryByRole('region', { name: 'Backup reminder' })).toBeNull();
    act(() => useStore.getState().resetAllData());
    expect(localStorage.getItem(BACKUP_REMINDER_KEY)).toBeNull();
  });
});
