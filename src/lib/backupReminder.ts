import { useSyncExternalStore } from 'react';
import { BACKUP_REMINDER_KEY } from '../store/keys';
import { hasVault, readVaultSlot, writeVaultSlot } from './vault';

const DAY = 86_400_000;
const CHANGED = 'glp1-backup-reminder-changed';
type Reminder = { confirmedAt?: number; snoozedUntil?: number };

function read(): string | null {
  try { return hasVault() ? readVaultSlot(BACKUP_REMINDER_KEY) : localStorage.getItem(BACKUP_REMINDER_KEY); } catch { return null; }
}

export function parseReminder(raw: string | null): Reminder {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (!value || typeof value !== 'object') return {};
    const data = value as Record<string, unknown>;
    const time = (key: string) => typeof data[key] === 'number' && Number.isFinite(data[key]) && data[key] > 0 ? data[key] as number : undefined;
    return { confirmedAt: time('confirmedAt'), snoozedUntil: time('snoozedUntil') };
  } catch { return {}; }
}

export function reminderDue(reminder: Reminder, now: number): boolean {
  // Ignore future confirmations and unreasonable snooze values rather than hiding reminders indefinitely.
  const recent = reminder.confirmedAt != null && reminder.confirmedAt <= now && now - reminder.confirmedAt < 7 * DAY;
  const snoozed = reminder.snoozedUntil != null && reminder.snoozedUntil > now && reminder.snoozedUntil - now <= DAY;
  return !recent && !snoozed;
}

function write(value: Reminder): boolean | Promise<boolean> {
  try {
    if (hasVault()) return writeVaultSlot(BACKUP_REMINDER_KEY, JSON.stringify(value)).then(() => { window.dispatchEvent(new Event(CHANGED)); return true; }, () => false);
    localStorage.setItem(BACKUP_REMINDER_KEY, JSON.stringify(value));
    window.dispatchEvent(new Event(CHANGED));
    return true;
  } catch { return false; }
}

export function confirmBackupSaved(now = Date.now()): boolean | Promise<boolean> {
  return write({ confirmedAt: now });
}

export function snoozeBackupReminder(now = Date.now()): boolean | Promise<boolean> {
  return write({ ...parseReminder(read()), snoozedUntil: now + DAY });
}

export function clearBackupReminder(): void {
  try {
    if (hasVault()) { void writeVaultSlot(BACKUP_REMINDER_KEY, null).then(() => window.dispatchEvent(new Event(CHANGED)), () => {}); return; }
    localStorage.removeItem(BACKUP_REMINDER_KEY);
    window.dispatchEvent(new Event(CHANGED));
  } catch { /* No confirmation is claimed when storage is unavailable. */ }
}

function subscribe(notify: () => void) {
  window.addEventListener(CHANGED, notify);
  window.addEventListener('storage', notify);
  return () => {
    window.removeEventListener(CHANGED, notify);
    window.removeEventListener('storage', notify);
  };
}

export function useBackupReminder(): Reminder {
  return parseReminder(useSyncExternalStore(subscribe, read, () => null));
}
