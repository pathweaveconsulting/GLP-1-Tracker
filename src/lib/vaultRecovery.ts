import { STORAGE_KEY, DAILY_LOGS_KEY, ROLLBACK_KEY, VAULT_SLOT_KEYS } from '../store/keys';
import { STORE_VERSION } from '../store/migrate';
import { DAILY_FORMAT, parseDailyLogs, serializeDailyLogs } from './dailyLogs';
import type { BackupData } from './backup';
import { prepareDataModelMigration, type DataModelV2 } from './dataModelV2';
import { isObj } from './rowValidation';
import { currentMainFormat, decodeV2, learnFromMainSlot, looksLikeV2, restoredV2, upgradeToV2 } from '../store/mainSlot';
import type { PersistedData } from '../types';
import { currentVaultSlots, transactVault } from './vault';
import type { VaultSlots } from './vaultCrypto';

export interface RecoveryPoint {
  format: 'glp1-recovery-point';
  version: 1;
  createdAt: string;
  reason: 'migration-preview' | 'rollback' | 'backup-import' | 'schema-upgrade';
  slots: VaultSlots;
}
export interface VaultMigrationPreview { original: string; model: DataModelV2 }

/** Reject unsupported fields rather than silently normalizing them during a preview or rollback. */
function modelFromSlots(slots: VaultSlots): DataModelV2 {
  const main = slots[STORAGE_KEY];
  if (!main) throw Error('No saved profile is available to preview.');
  const envelope: unknown = JSON.parse(main);
  let data: Record<string, unknown>;
  if (looksLikeV2(envelope)) {
    // Upgraded records are validated exactly; their provenance is checked by decodeV2.
    const { hasOnboarded: _onboarded, ...rest } = decodeV2(envelope).state;
    data = rest as unknown as Record<string, unknown>;
  } else {
    if (!isObj(envelope) || Object.keys(envelope).some(k => !['state','version'].includes(k)) || envelope.version !== STORE_VERSION || !isObj(envelope.state)) throw Error('Unsupported saved store. Nothing was changed.');
    const { hasOnboarded, ...rest } = envelope.state;
    if (typeof hasOnboarded !== 'boolean') throw Error('Missing onboarding state. Nothing was changed.');
    data = rest;
  }
  const daily = slots[DAILY_LOGS_KEY];
  if (daily !== undefined) {
    const e: unknown = JSON.parse(daily);
    if (!isObj(e) || Object.keys(e).some(k => !['format','version','entries'].includes(k)) || e.format !== DAILY_FORMAT || e.version !== 1) throw Error('Unsupported daily records. Nothing was changed.');
  }
  const plan = prepareDataModelMigration(JSON.stringify({ ...data, ...(daily !== undefined ? { dailyLogs: parseDailyLogs(daily) } : {}) }));
  if (!plan.ok) throw Error(plan.error);
  return plan.data;
}

export function previewVaultMigration(): VaultMigrationPreview {
  const slots = currentVaultSlots();
  return { original: JSON.stringify(slots), model: modelFromSlots(slots) };
}

export function parseRecoveryPoint(raw: string): RecoveryPoint {
  const value: unknown = JSON.parse(raw);
  if (!isObj(value) || Object.keys(value).some(k => !['format','version','createdAt','reason','slots'].includes(k)) || value.format !== 'glp1-recovery-point' || value.version !== 1 || typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt)) || !['migration-preview','rollback','backup-import','schema-upgrade'].includes(String(value.reason)) || !isObj(value.slots)) throw Error('Unsupported recovery point. Nothing was restored.');
  if (Object.entries(value.slots).some(([k,v]) => k === ROLLBACK_KEY || !VAULT_SLOT_KEYS.includes(k) || typeof v !== 'string')) throw Error('Unsupported recovery slots. Nothing was restored.');
  modelFromSlots(value.slots as VaultSlots);
  return value as unknown as RecoveryPoint;
}

function recoveryPoint(slots: VaultSlots, reason: RecoveryPoint['reason']): string {
  const copy = { ...slots };
  delete copy[ROLLBACK_KEY]; // Keep one generation; never nest the previous history inside the next.
  return JSON.stringify({ format: 'glp1-recovery-point', version: 1, createdAt: new Date().toISOString(), reason, slots: copy } satisfies RecoveryPoint);
}

/** Exact prior bytes and the new recovery slot commit in a single encrypted envelope. No schema cutover. */
export function saveMigrationRecoveryPoint(preview: VaultMigrationPreview): Promise<void> {
  return transactVault(slots => {
    if (JSON.stringify(slots) !== preview.original) throw Error('Records changed after preview. Preview them again before saving.');
    modelFromSlots(slots);
    return { ...slots, [ROLLBACK_KEY]: recoveryPoint(slots, 'migration-preview') };
  });
}

/** Swap exact prior slots atomically; the replaced current records become the one available undo point. */
export function restoreRecoveryPoint(expected: string): Promise<void> {
  return transactVault(slots => {
    if (slots[ROLLBACK_KEY] !== expected) throw Error('Recovery point changed. Review it again before restoring.');
    const point = parseRecoveryPoint(expected);
    modelFromSlots(slots); // Do not replace unsupported current data with an older generation.
    return { ...point.slots, [ROLLBACK_KEY]: recoveryPoint(slots, 'rollback') };
  }).then(() => learnFromMainSlot(currentVaultSlots()[STORAGE_KEY]));
}

/** Format of the saved main record slot: 1 (original) or 2 (upgraded). */
export function savedMainFormat(slots: VaultSlots = currentVaultSlots()): 1 | 2 {
  const main = slots[STORAGE_KEY];
  return main !== undefined && looksLikeV2(JSON.parse(main)) ? 2 : 1;
}

/**
 * The explicit, confirmed upgrade to the live schema-2 format. The upgraded records and an exact recovery point of
 * the original slots commit in one encrypted envelope, or nothing changes. Restoring that recovery point returns the
 * vault to the original format.
 */
export function upgradeVaultToSchemaV2(preview: VaultMigrationPreview): Promise<void> {
  let upgraded: string | undefined;
  return transactVault(slots => {
    if (JSON.stringify(slots) !== preview.original) throw Error('Records changed after preview. Preview them again before upgrading.');
    if (savedMainFormat(slots) === 2) throw Error('These records already use the new format.');
    modelFromSlots(slots);
    const envelope = JSON.parse(slots[STORAGE_KEY]!) as { state: PersistedData };
    upgraded = upgradeToV2(envelope.state).raw;
    return { ...slots, [STORAGE_KEY]: upgraded, [ROLLBACK_KEY]: recoveryPoint(slots, 'schema-upgrade') };
  }).then(() => learnFromMainSlot(upgraded));
}

/** Capture all current slots when showing the replacement confirmation, including pending ordinary edits. */
export const backupRestoreBaseline = (): string => JSON.stringify(currentVaultSlots());

/** Imported records and their exact pre-import recovery point are saved together, or neither is saved. */
export function restoreBackupWithRecovery(data: BackupData, expected: string): Promise<void> {
  const plan = prepareDataModelMigration(JSON.stringify(data));
  if (!plan.ok) throw Error(plan.error);
  // Serialize before awaiting a queue; later mutation of the caller's object cannot change the approved import.
  const state: PersistedData = {settings:data.settings,doses:data.doses,weights:data.weights,effects:data.effects,hasOnboarded:true};
  // An upgraded vault stays upgraded: imported records are written in the new format, marked as restored.
  const main = currentMainFormat() === 2 ? restoredV2(state) : JSON.stringify({state,version:STORE_VERSION});
  const daily = data.dailyLogs === undefined ? null : serializeDailyLogs(data.dailyLogs);
  const imported: VaultSlots = {[STORAGE_KEY]:main,...(daily === null ? {} : {[DAILY_LOGS_KEY]:daily})};
  modelFromSlots(imported);
  return transactVault(slots => {
    if (JSON.stringify(slots) !== expected) throw Error('Records changed after the backup preview. Select the file again and review it before replacing data.');
    modelFromSlots(slots); // Preserve unsupported current data by refusing replacement, even if the import is valid.
    const next: VaultSlots = {...slots,...imported,[ROLLBACK_KEY]:recoveryPoint(slots,'backup-import')};
    if (daily === null) delete next[DAILY_LOGS_KEY];
    return next;
  }).then(() => learnFromMainSlot(main));
}
