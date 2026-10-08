import { openEncryptedVault, VAULT_FORMAT } from './vaultCrypto';
import { STORE_VERSION, supportedStoreVersion } from '../store/migrate';
import { decodeV2, looksLikeV2 } from '../store/mainSlot';
import { STORAGE_KEY, DAILY_LOGS_KEY } from '../store/keys';
import { parseDailyLogs } from './dailyLogs';
import { createBackup, parseBackup, type BackupData } from './backup';

export function isEncryptedBackup(text: string): boolean {
  try { return JSON.parse(text)?.format === VAULT_FORMAT; } catch { return false; }
}

export async function decryptBackup(text: string, secret: string, recovery = false) {
  const { slots } = await openEncryptedVault(text, secret, recovery);
  const main = slots[STORAGE_KEY];
  if (!main) throw new Error('This encrypted file contains no restorable records.');
  let value: unknown = JSON.parse(main);
  if (looksLikeV2(value)) {
    // Upgraded (schema 2) records: validate exactly, then restore their records like any other backup.
    const { hasOnboarded: _onboarded, ...state } = decodeV2(value).state;
    value = { state, version: STORE_VERSION };
  }
  if (!value || typeof value !== 'object' || !('state' in value)) throw new Error('This file contains unreadable original data rather than a restorable backup.');
  if (!supportedStoreVersion((value as {version?: unknown}).version)) throw Error('This backup contains a newer or unsupported store version. Update the app before restoring.');
  const dailyRaw = slots[DAILY_LOGS_KEY];
  return parseBackup(JSON.stringify(createBackup({...(value as { state: BackupData }).state, ...(dailyRaw === undefined ? {} : {dailyLogs:parseDailyLogs(dailyRaw)})})));
}
