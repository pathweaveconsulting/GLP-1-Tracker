import { STORAGE_KEY, DAILY_LOGS_KEY, ROLLBACK_KEY, VAULT_SLOT_KEYS } from '../store/keys';
import { STORE_VERSION } from '../store/migrate';
import { DAILY_FORMAT, parseDailyLogs } from './dailyLogs';
import { prepareDataModelMigration, type DataModelV2 } from './dataModelV2';
import { isObj } from './rowValidation';
import { currentVaultSlots, transactVault } from './vault';
import type { VaultSlots } from './vaultCrypto';

export interface RecoveryPoint {
  format: 'glp1-recovery-point';
  version: 1;
  createdAt: string;
  reason: 'migration-preview' | 'rollback';
  slots: VaultSlots;
}
export interface VaultMigrationPreview { original: string; model: DataModelV2 }

/** Reject unsupported fields rather than silently normalizing them during a preview or rollback. */
function modelFromSlots(slots: VaultSlots): DataModelV2 {
  const main = slots[STORAGE_KEY];
  if (!main) throw Error('No saved profile is available to preview.');
  const envelope: unknown = JSON.parse(main);
  if (!isObj(envelope) || Object.keys(envelope).some(k => !['state','version'].includes(k)) || envelope.version !== STORE_VERSION || !isObj(envelope.state)) throw Error('Unsupported saved store. Nothing was changed.');
  const { hasOnboarded, ...data } = envelope.state;
  if (typeof hasOnboarded !== 'boolean') throw Error('Missing onboarding state. Nothing was changed.');
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
  if (!isObj(value) || Object.keys(value).some(k => !['format','version','createdAt','reason','slots'].includes(k)) || value.format !== 'glp1-recovery-point' || value.version !== 1 || typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt)) || !['migration-preview','rollback'].includes(String(value.reason)) || !isObj(value.slots)) throw Error('Unsupported recovery point. Nothing was restored.');
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
  });
}
