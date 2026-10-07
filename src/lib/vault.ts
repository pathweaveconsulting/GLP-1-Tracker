import { CORRUPT_KEY, STORAGE_KEY, BACKUP_REMINDER_KEY, VAULT_KEY, DAILY_LOGS_KEY } from '../store/keys';
import { createEncryptedVault, decryptSlots, encryptSlots, openEncryptedVault, serializeVault, type VaultEnvelope, type VaultSlots } from './vaultCrypto';

export { VAULT_KEY } from '../store/keys';
let session: { key: CryptoKey; envelope: VaultEnvelope; slots: VaultSlots; expected: string } | null = null;
let queue: Promise<void> = Promise.resolve();
let pending = 0;
let lockedBackup: { raw: string; source: string } | null = null;
export const getLockedBackup = () => lockedBackup?.raw ?? null;
export const hasPendingVaultWrites = () => pending > 0;
export const hasVault = () => localStorage.getItem(VAULT_KEY) !== null;
export const isVaultUnlocked = () => session !== null;
export const flushVault = () => queue;
const listeners = new Set<() => void>();
export const subscribeVaultSlots = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const changed = () => { listeners.forEach(listener => listener()); };

export function readVaultSlot(name: string): string | null {
  if (!session) throw new Error('Vault is locked.');
  return session.slots[name] ?? null;
}

/** Serialize commits and compare stored bytes before each write, preventing silent multi-tab overwrites. */
export function writeVaultSlot(name: string, value: string | null): Promise<void> {
  const active = session;
  if (!active) return Promise.reject(new Error('Vault is locked.'));
  if (![STORAGE_KEY, CORRUPT_KEY, BACKUP_REMINDER_KEY, DAILY_LOGS_KEY].includes(name)) return Promise.reject(new Error('Unsupported record key.'));
  const previous = active.slots[name];
  if (value === null) delete active.slots[name]; else active.slots[name] = value;
  changed();
  const slots = { ...active.slots };
  pending++;
  queue = queue.then(async () => {
    if (session !== active) throw new Error('Vault session changed.');
    if (localStorage.getItem(VAULT_KEY) !== active.expected) throw new Error('Another tab changed this vault. Save a backup before reloading.');
    const next = await encryptSlots(active.envelope, active.key, slots);
    const raw = serializeVault(next);
    if (!navigator.locks) throw new Error('This browser does not support safe encrypted saving. Use a current browser.');
    await navigator.locks.request('glp1-vault-write', () => {
      if (localStorage.getItem(VAULT_KEY) !== active.expected || session !== active) throw new Error('Vault changed during saving.');
      localStorage.setItem(VAULT_KEY, raw);
      if (localStorage.getItem(VAULT_KEY) !== raw) throw new Error('Encrypted save could not be verified.');
      active.envelope = next;
      active.expected = raw;
    });
  }).catch(error => {
    // A failed reminder confirmation must not appear saved. Health records stay in memory for recovery.
    if (name === BACKUP_REMINDER_KEY && (active.slots[name] ?? null) === value) {
      if (previous === undefined) delete active.slots[name]; else active.slots[name] = previous;
    }
    throw error;
  }).finally(() => { pending--; });
  return queue;
}

export async function prepareVault(passphrase: string) {
  if (!crypto.subtle || !navigator.locks) throw new Error('Use a current browser with secure storage support over HTTPS.');
  if (hasVault()) throw new Error('A vault already exists. Unlock it instead.');
  const slots: VaultSlots = {};
  for (const name of [STORAGE_KEY, CORRUPT_KEY, BACKUP_REMINDER_KEY]) {
    const raw = localStorage.getItem(name);
    if (raw !== null) slots[name] = raw;
  }
  return { ...(await createEncryptedVault(passphrase, slots)), slots };
}

export async function activatePreparedVault(prepared: Awaited<ReturnType<typeof prepareVault>>): Promise<void> {
  return navigator.locks.request('glp1-vault-write', async () => {
  if (hasVault()) throw new Error('A vault was created in another tab. Reload before continuing.');
  for (const name of [STORAGE_KEY, CORRUPT_KEY, BACKUP_REMINDER_KEY]) {
    if (localStorage.getItem(name) !== (prepared.slots[name] ?? null)) throw new Error('Records changed during setup. Please start setup again.');
  }
  const raw = serializeVault(prepared.envelope);
  localStorage.setItem(VAULT_KEY, raw);
  const stored = localStorage.getItem(VAULT_KEY);
  if (stored !== raw || JSON.stringify(await decryptSlots(prepared.envelope, prepared.key)) !== JSON.stringify(prepared.slots)) throw new Error('Encrypted copy could not be verified. Original records were kept.');
  session = { key: prepared.key, envelope: prepared.envelope, slots: { ...prepared.slots }, expected: raw };
  queue = Promise.resolve();
  // Only after verified ciphertext exists. If removal fails, unlocking retries cleanup and the app remains gated.
  try { cleanLegacyCopies(); } catch (error) { session = null; throw error; }
  });
}

function cleanLegacyCopies(): void {
  for (const name of [STORAGE_KEY, CORRUPT_KEY, BACKUP_REMINDER_KEY]) {
    const raw = localStorage.getItem(name);
    if (raw !== null && raw !== session?.slots[name]) throw new Error('Unencrypted records changed during migration. They were kept. Export them before retrying migration.');
    localStorage.removeItem(name);
    if (localStorage.getItem(name) !== null) throw new Error('An old plaintext copy could not be removed. Please retry unlocking.');
  }
}

export async function unlockVault(secret: string, recovery = false): Promise<void> {
  const stored = localStorage.getItem(VAULT_KEY);
  if (!stored) throw new Error('No vault is stored.');
  if (lockedBackup && lockedBackup.source !== stored) throw new Error('Another tab changed the saved vault. Download the unsaved encrypted backup before reloading.');
  const raw = lockedBackup?.raw ?? stored;
  const opened = await openEncryptedVault(raw, secret, recovery);
  if (localStorage.getItem(VAULT_KEY) !== stored) throw new Error('Vault changed during unlocking. Please retry.');
  session = { ...opened, expected: stored };
  queue = Promise.resolve();
  try { cleanLegacyCopies(); } catch (error) { session = null; throw error; }
  lockedBackup = null;
  changed();
}

export function discardVaultSession(preserveUnsaved = false): void {
  session = null;
  queue = Promise.resolve();
  if (!preserveUnsaved) lockedBackup = null;
  changed();
}

/** A failed save never forces the UI to stay unlocked: retain only ciphertext for unsaved recovery. */
export async function lockVault(main: string): Promise<boolean> {
  const active = session;
  if (!active) return false;
  try { await flushVault(); lockedBackup = null; }
  catch { lockedBackup = { raw: await encryptedBackup(main), source: active.expected }; }
  const hasUnsaved = lockedBackup !== null;
  session = null;
  queue = Promise.resolve();
  changed();
  return hasUnsaved;
}


/** Export current in-memory records, including unsaved changes when storage is full, under the existing wrapped key. */
export async function encryptedBackup(main: string): Promise<string> {
  if (!session) throw new Error('Unlock your vault first.');
  return serializeVault(await encryptSlots(session.envelope, session.key, { ...session.slots, [STORAGE_KEY]: main }));
}
