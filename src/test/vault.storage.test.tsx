import { webcrypto } from 'node:crypto';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { activatePreparedVault, discardVaultSession, encryptedBackup, flushVault, hasVault, prepareVault, readVaultSlot, unlockVault, VAULT_KEY, writeVaultSlot, lockVault, getLockedBackup } from '../lib/vault';
import { decryptBackup } from '../lib/encryptedRestore';
import { VaultGate } from '../components/VaultGate';
import { useStore } from '../store/useStore';
import { STORAGE_KEY, CORRUPT_KEY, BACKUP_REMINDER_KEY } from '../store/keys';
import { confirmBackupSaved } from '../lib/backupReminder';
import { seedStore } from './fixtures';

const phrase = 'violet orchard river mountain';
beforeEach(() => {
  discardVaultSession();
  vi.stubGlobal('crypto', webcrypto);
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: async (_name: string, callback: () => unknown) => callback() } });
});
afterEach(async () => { await flushVault().catch(() => {}); discardVaultSession(); vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('private vault storage', () => {
  it('verifies and encrypts main and rescue copies before removing plaintext; unlock rehydrates all records', async () => {
    seedStore('populated', 'kg');
    const { settings, doses, weights, effects } = useStore.getState();
    const original = { settings, doses, weights, effects };
    const raw = localStorage.getItem(STORAGE_KEY);
    localStorage.setItem(CORRUPT_KEY, 'unreadable original');
    const reminder = JSON.stringify({ confirmedAt: 1760000000000 });
    localStorage.setItem(BACKUP_REMINDER_KEY, reminder);
    const prepared = await prepareVault(phrase);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
    expect(hasVault()).toBe(false);
    await activatePreparedVault(prepared);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(CORRUPT_KEY)).toBeNull();
    expect(localStorage.getItem(BACKUP_REMINDER_KEY)).toBeNull();
    expect(localStorage.getItem(VAULT_KEY)).not.toContain('1760000000000');
    expect(localStorage.getItem(VAULT_KEY)).not.toContain('unreadable original');
    discardVaultSession();
    expect(() => readVaultSlot(STORAGE_KEY)).toThrow('locked');
    await unlockVault(prepared.recoveryKey, true);
    expect(readVaultSlot(CORRUPT_KEY)).toBe('unreadable original');
    expect(readVaultSlot(BACKUP_REMINDER_KEY)).toBe(reminder);
    await useStore.persist.rehydrate();
    expect({ settings: useStore.getState().settings, doses: useStore.getState().doses, weights: useStore.getState().weights, effects: useStore.getState().effects }).toEqual(original);
  });

  it('keeps original records when encrypted migration cannot be saved', async () => {
    seedStore('populated', 'kg');
    const raw = localStorage.getItem(STORAGE_KEY);
    const prepared = await prepareVault(phrase);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    await expect(activatePreparedVault(prepared)).rejects.toThrow();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
    expect(hasVault()).toBe(false);
  });

  it('does not claim a backup confirmation when encrypted saving fails', async () => {
    await activatePreparedVault(await prepareVault(phrase));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    expect(await confirmBackupSaved(1760000000000)).toBe(false);
    expect(readVaultSlot(BACKUP_REMINDER_KEY)).toBeNull();
    expect(localStorage.getItem(BACKUP_REMINDER_KEY)).toBeNull();
  });

  it('preserves both copies if legacy removal fails and retries cleanup on unlocking', async () => {
    seedStore('populated', 'kg');
    const raw = localStorage.getItem(STORAGE_KEY);
    const prepared = await prepareVault(phrase);
    const remove = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('Blocked'); });
    await expect(activatePreparedVault(prepared)).rejects.toThrow();
    expect(hasVault()).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
    remove.mockRestore();
    await unlockVault(phrase);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('serializes rapid saves, preserves encrypted rescue data, and blocks stale-tab writes', async () => {
    localStorage.setItem(STORAGE_KEY, 'before');
    await activatePreparedVault(await prepareVault(phrase));
    await Promise.all([writeVaultSlot(STORAGE_KEY, 'first'), writeVaultSlot(CORRUPT_KEY, 'rescue'), writeVaultSlot(STORAGE_KEY, 'latest')]);
    discardVaultSession();
    await unlockVault(phrase);
    expect(readVaultSlot(STORAGE_KEY)).toBe('latest');
    expect(readVaultSlot(CORRUPT_KEY)).toBe('rescue');
    const foreign = 'changed by another tab';
    localStorage.setItem(VAULT_KEY, foreign);
    await expect(writeVaultSlot(STORAGE_KEY, 'overwrite')).rejects.toThrow('Another tab');
    expect(localStorage.getItem(VAULT_KEY)).toBe(foreign);
  });

  it('encrypted backup restores all data with the recovery key and wrong secrets change nothing', async () => {
    seedStore('populated', 'kg');
    const main = localStorage.getItem(STORAGE_KEY)!;
    const prepared = await prepareVault(phrase);
    await activatePreparedVault(prepared);
    const backup = await encryptedBackup(main);
    const result = await decryptBackup(backup, prepared.recoveryKey, true);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const state = useStore.getState();
      expect(result.data).toEqual({ settings: state.settings, doses: state.doses, weights: state.weights, effects: state.effects });
    }
    const before = localStorage.getItem(VAULT_KEY);
    await expect(decryptBackup(backup, 'wrong')).rejects.toThrow();
    expect(localStorage.getItem(VAULT_KEY)).toBe(before);
  });

  it('locks after a failed save while preserving unsaved records as recoverable ciphertext only', async () => {
    seedStore('populated', 'kg');
    await activatePreparedVault(await prepareVault(phrase));
    const saved = localStorage.getItem(VAULT_KEY);
    const main = JSON.stringify({ state: { ...JSON.parse(readVaultSlot(STORAGE_KEY)!).state, weights: [{ id: 'unsaved', weightLbs: 220, date: '2026-01-01T12:00:00Z' }] }, version: 1 });
    const fail = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    await expect(writeVaultSlot(STORAGE_KEY, main)).rejects.toThrow();
    expect(await lockVault(main)).toBe(true);
    expect(() => readVaultSlot(STORAGE_KEY)).toThrow('locked');
    expect(getLockedBackup()).not.toContain('unsaved');
    expect(localStorage.getItem(VAULT_KEY)).toBe(saved);
    const recovered = await decryptBackup(getLockedBackup()!, phrase);
    expect(recovered.ok && recovered.data.weights[0].id).toBe('unsaved');
    fail.mockRestore();
    await unlockVault(phrase);
    expect(readVaultSlot(STORAGE_KEY)).toBe(main);
    await writeVaultSlot(STORAGE_KEY, main);
    expect(getLockedBackup()).toBeNull();
  });

  it('does not mount private content before unlock and rejects a wrong passphrase', async () => {
    seedStore('populated', 'kg');
    await activatePreparedVault(await prepareVault(phrase));
    discardVaultSession();
    render(<VaultGate><div>Private dashboard</div></VaultGate>);
    expect(screen.queryByText('Private dashboard')).toBeNull();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Vault passphrase'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Unlock records' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not unlock');
    expect(screen.queryByText('Private dashboard')).toBeNull();
    await user.clear(screen.getByLabelText('Vault passphrase'));
    await user.type(screen.getByLabelText('Vault passphrase'), phrase);
    await user.click(screen.getByRole('button', { name: 'Unlock records' }));
    expect(await screen.findByText('Private dashboard')).toBeInTheDocument();
    await flushVault();
    vi.useFakeTimers();
    fireEvent.keyDown(window, { key: 'Shift' });
    await act(async () => { vi.advanceTimersByTime(10 * 60_000 + 1); await Promise.resolve(); });
    expect(screen.queryByText('Private dashboard')).toBeNull();
    expect(useStore.getState().weights).toEqual([]);
    expect(() => readVaultSlot(STORAGE_KEY)).toThrow('locked');
  });
});
