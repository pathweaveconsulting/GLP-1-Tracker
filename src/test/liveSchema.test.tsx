import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { activatePreparedVault, currentVaultSlots, discardVaultSession, encryptedBackup, flushVault, prepareVault, readVaultSlot, unlockVault, writeVaultSlot } from '../lib/vault';
import { backupRestoreBaseline, parseRecoveryPoint, previewVaultMigration, restoreBackupWithRecovery, restoreRecoveryPoint, savedMainFormat, upgradeVaultToSchemaV2 } from '../lib/vaultRecovery';
import { decryptBackup } from '../lib/encryptedRestore';
import { serializeDailyLogs } from '../lib/dailyLogs';
import { DAILY_LOGS_KEY, ROLLBACK_KEY, STORAGE_KEY, VAULT_KEY } from '../store/keys';
import { useStore } from '../store/useStore';
import { resumeWrites, storageReport } from '../store/storage';
import { resetMainSlotState } from '../store/mainSlot';
import { seedStore } from './fixtures';
import { MigrationRecovery } from '../components/MigrationRecovery';
import type { DataModelV2 } from '../lib/dataModelV2';

// Synthetic records only (fixtures). The passphrase is a test constant, never a real credential.
const phrase = 'violet orchard river mountain';
const records = () => { const { settings, doses, weights, effects } = useStore.getState(); return structuredClone({ settings, doses, weights, effects }); };
const mainModel = (): DataModelV2 => JSON.parse(readVaultSlot(STORAGE_KEY)!).state.model;
const relock = async () => { await flushVault(); discardVaultSession(); resetMainSlotState(); await unlockVault(phrase); await useStore.persist.rehydrate(); };

beforeEach(async () => {
  discardVaultSession(); resumeWrites(); resetMainSlotState(); vi.stubGlobal('crypto', webcrypto);
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: async (_: string, callback: () => unknown) => callback() } });
  seedStore('populated', 'kg');
  await activatePreparedVault(await prepareVault(phrase));
  await writeVaultSlot(DAILY_LOGS_KEY, serializeDailyLogs([{ date: '2026-10-01', proteinGrams: 80, notes: '' }]));
  await useStore.persist.rehydrate();
});
afterEach(async () => { cleanup(); await flushVault().catch(() => {}); discardVaultSession(); resumeWrites(); resetMainSlotState(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('upgrading saved records to the schema-2 format', () => {
  it('converts in one encrypted commit, keeps every record exactly, marks them legacy and keeps the original as recovery', async () => {
    const before = records();
    const original = currentVaultSlots();
    await upgradeVaultToSchemaV2(previewVaultMigration());
    expect(savedMainFormat()).toBe(2);
    expect(JSON.parse(readVaultSlot(STORAGE_KEY)!).version).toBe(2);
    expect(parseRecoveryPoint(readVaultSlot(ROLLBACK_KEY)!)).toMatchObject({ reason: 'schema-upgrade', slots: original });
    expect(readVaultSlot(DAILY_LOGS_KEY)).toBe(original[DAILY_LOGS_KEY]); // daily totals stay canonical in their own slot
    const model = mainModel();
    expect(model.checkIns).toEqual([]);
    expect(model.metadata.provenance.doses.every((p) => p.source === 'legacy' && p.createdAt === null && p.updatedAt === null)).toBe(true);
    expect(localStorage.getItem(VAULT_KEY)).not.toContain('Tirzepatide');
    await relock();
    expect(records()).toEqual(before);
    expect(storageReport.readFailed).toBe(false);
  });

  it('after the upgrade, saves keep the new format and record where each record came from', async () => {
    await upgradeVaultToSchemaV2(previewVaultMigration());
    await useStore.persist.rehydrate();
    const store = useStore.getState();
    const edited = store.weights[0];
    store.addDose({ medication: 'Tirzepatide', amountMg: 5, date: new Date().toISOString(), site: 'Thigh: Left', painLevel: null, notes: 'new' });
    const { id: _id, ...fields } = edited;
    expect(store.editWeight(edited, { ...fields, weightLbs: edited.weightLbs - 1 })).toBe(true);
    useStore.getState().addWeights([{ weightLbs: 180, date: '2026-01-02T12:00:00.000Z' }, { weightLbs: 181, date: '2026-01-03T12:00:00.000Z' }]);
    await flushVault();
    await relock();
    expect(savedMainFormat()).toBe(2);
    const model = mainModel();
    const added = model.metadata.provenance.doses.at(-1)!;
    expect(added).toMatchObject({ source: 'manual', updatedAt: null, importBatchId: null });
    expect(Number.isFinite(Date.parse(added.createdAt!))).toBe(true);
    const editedProvenance = model.metadata.provenance.weights.find((p) => p.id === edited.id)!;
    expect(editedProvenance).toMatchObject({ source: 'legacy', createdAt: null });
    expect(editedProvenance.updatedAt).not.toBeNull();
    const imported = model.metadata.provenance.weights.slice(-2);
    expect(imported.every((p) => p.source === 'csv_import' && p.importBatchId === imported[0].importBatchId && p.importBatchId)).toBe(true);
    const untouched = model.metadata.provenance.doses[0];
    expect(untouched).toMatchObject({ source: 'legacy', createdAt: null, updatedAt: null });
  });

  it('restoring the recovery point returns the original bytes, and later saves use the original format again', async () => {
    const original = currentVaultSlots();
    await upgradeVaultToSchemaV2(previewVaultMigration());
    await restoreRecoveryPoint(readVaultSlot(ROLLBACK_KEY)!);
    const restored = currentVaultSlots(); delete restored[ROLLBACK_KEY];
    expect(restored).toEqual(original);
    // Even a save that lands before the view reloads must use the restored (original) format.
    useStore.getState().updateSettings({ targetWeight: 150 });
    await flushVault();
    expect(JSON.parse(readVaultSlot(STORAGE_KEY)!).version).toBe(1);
    await useStore.persist.rehydrate();
    useStore.getState().updateSettings({ targetWeight: 151 });
    await flushVault();
    expect(savedMainFormat()).toBe(1);
  });

  it('a storage failure during the upgrade changes nothing, and saving continues in the original format', async () => {
    const vaultBefore = localStorage.getItem(VAULT_KEY);
    const slotsBefore = currentVaultSlots();
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    await expect(upgradeVaultToSchemaV2(previewVaultMigration())).rejects.toThrow();
    setItem.mockRestore();
    expect(localStorage.getItem(VAULT_KEY)).toBe(vaultBefore);
    expect(currentVaultSlots()).toEqual(slotsBefore);
    useStore.getState().updateSettings({ targetWeight: 150 });
    await flushVault();
    expect(JSON.parse(readVaultSlot(STORAGE_KEY)!).version).toBe(1);
  });

  it('refuses a stale preview and a second upgrade', async () => {
    const preview = previewVaultMigration();
    useStore.getState().updateSettings({ targetWeight: 155 });
    await flushVault();
    await expect(upgradeVaultToSchemaV2(preview)).rejects.toThrow(/changed after preview/);
    expect(savedMainFormat()).toBe(1);
    await upgradeVaultToSchemaV2(previewVaultMigration());
    await expect(upgradeVaultToSchemaV2(previewVaultMigration())).rejects.toThrow(/already use the new format/);
  });
});

describe('reading upgraded records safely', () => {
  it('invalid or unsupported upgraded data pauses saving and keeps the exact bytes', async () => {
    await upgradeVaultToSchemaV2(previewVaultMigration());
    const valid = JSON.parse(readVaultSlot(STORAGE_KEY)!);
    for (const tamper of [
      (m: DataModelV2) => { (m.metadata.provenance.doses[0] as { source: string }).source = 'integration'; },
      (m: DataModelV2) => { (m as unknown as { supplies: unknown[] }).supplies = [{ id: 'future' }]; },
      (m: DataModelV2) => { m.metadata.provenance.weights.pop(); },
    ]) {
      const broken = structuredClone(valid);
      tamper(broken.state.model);
      const raw = JSON.stringify(broken);
      await writeVaultSlot(STORAGE_KEY, raw);
      await relock();
      expect(storageReport.readFailed).toBe(true);
      expect(storageReport.unsupportedVersion).toBe(true);
      useStore.setState({ hasOnboarded: true });
      useStore.getState().updateSettings({ targetWeight: 140 });
      await flushVault();
      expect(readVaultSlot(STORAGE_KEY)).toBe(raw);
      resumeWrites();
    }
  });

  it('an encrypted download of upgraded records restores them', async () => {
    const before = records();
    await upgradeVaultToSchemaV2(previewVaultMigration());
    const result = await decryptBackup(await encryptedBackup(readVaultSlot(STORAGE_KEY)!), phrase);
    expect(result.ok).toBe(true);
    if (result.ok) expect({ settings: result.data.settings, doses: result.data.doses, weights: result.data.weights, effects: result.data.effects }).toEqual(before);
  });

  it('a backup restored into an upgraded vault stays upgraded, marked as restored', async () => {
    await upgradeVaultToSchemaV2(previewVaultMigration());
    await useStore.persist.rehydrate();
    const data = records();
    await restoreBackupWithRecovery({ ...data, dailyLogs: [] }, backupRestoreBaseline());
    expect(savedMainFormat()).toBe(2);
    expect(mainModel().metadata.provenance.doses.every((p) => p.source === 'backup_restore' && p.createdAt)).toBe(true);
  });
});

describe('Settings', () => {
  it('offers the upgrade only behind its flag, with a confirmation, and then shows the new format', async () => {
    const { unmount } = render(<MigrationRecovery />);
    expect(screen.queryByRole('button', { name: 'Upgrade record format' })).toBeNull();
    unmount();
    vi.stubEnv('VITE_ENABLE_LIVE_SCHEMA_V2', 'true');
    render(<MigrationRecovery />);
    expect(screen.getByText(/Record format: original format/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Upgrade record format' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Upgrade record format?' });
    expect(dialog).toHaveTextContent(/Older versions of this app cannot open upgraded records/);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Upgrade records' }));
    await waitFor(() => expect(screen.getByText(/Record format: new format/)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Upgrade record format' })).toBeNull();
    expect(savedMainFormat()).toBe(2);
  });
});
