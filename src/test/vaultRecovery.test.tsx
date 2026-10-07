import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { activatePreparedVault, currentVaultSlots, discardVaultSession, encryptedBackup, flushVault, prepareVault, readVaultSlot, unlockVault, writeVaultSlot } from '../lib/vault';
import { parseRecoveryPoint, previewVaultMigration, restoreRecoveryPoint, saveMigrationRecoveryPoint } from '../lib/vaultRecovery';
import { openEncryptedVault } from '../lib/vaultCrypto';
import { serializeDailyLogs } from '../lib/dailyLogs';
import { BACKUP_REMINDER_KEY, CORRUPT_KEY, DAILY_LOGS_KEY, ROLLBACK_KEY, STORAGE_KEY, VAULT_KEY } from '../store/keys';
import { useStore } from '../store/useStore';
import { resumeWrites } from '../store/storage';
import { seedStore } from './fixtures';
import { MigrationRecovery } from '../components/MigrationRecovery';
const phrase = 'violet orchard river mountain';
beforeEach(async () => {
  discardVaultSession(); resumeWrites(); vi.stubGlobal('crypto', webcrypto);
  Object.defineProperty(navigator, 'locks', { configurable:true, value:{request:async (_:string, callback:()=>unknown)=>callback()} });
  seedStore('populated','kg');
  await activatePreparedVault(await prepareVault(phrase));
  await writeVaultSlot(DAILY_LOGS_KEY, serializeDailyLogs([{date:'2026-10-01',proteinGrams:0,notes:'Keep me; water is unrecorded'}]));
  await writeVaultSlot(CORRUPT_KEY, 'raw rescue bytes');
  await writeVaultSlot(BACKUP_REMINDER_KEY, 'reminder bytes');
});
afterEach(async () => { await flushVault().catch(()=>{}); discardVaultSession(); resumeWrites(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('preserves exact bytes across unlock and encrypted download without activating schema 2 or nesting generations', async () => {
  const original = currentVaultSlots(), preview = previewVaultMigration();
  expect(preview.model.checkIns[0]).toEqual({date:'2026-10-01',proteinGrams:0,notes:'Keep me; water is unrecorded'});
  expect(preview.model.metadata.provenance.weights[0].createdAt).toBeNull();
  expect(readVaultSlot(ROLLBACK_KEY)).toBeNull();
  await saveMigrationRecoveryPoint(preview);
  const point = readVaultSlot(ROLLBACK_KEY)!;
  expect(parseRecoveryPoint(point).slots).toEqual(original);
  expect(readVaultSlot(STORAGE_KEY)).toBe(original[STORAGE_KEY]);
  expect(JSON.parse(readVaultSlot(STORAGE_KEY)!).version).toBe(1);
  expect(localStorage.getItem(ROLLBACK_KEY)).toBeNull();
  expect(localStorage.getItem(VAULT_KEY)).not.toContain('Keep me');
  const exported = await openEncryptedVault(await encryptedBackup(original[STORAGE_KEY]),phrase);
  expect(exported.slots[ROLLBACK_KEY]).toBe(point);
  discardVaultSession(); await unlockVault(phrase);
  expect(readVaultSlot(ROLLBACK_KEY)).toBe(point);
  await saveMigrationRecoveryPoint(previewVaultMigration());
  expect(parseRecoveryPoint(readVaultSlot(ROLLBACK_KEY)!).slots[ROLLBACK_KEY]).toBeUndefined();
});

it('atomically rolls every slot back, hydrates the profile and makes the replaced records recoverable', async () => {
  const original = currentVaultSlots();
  await saveMigrationRecoveryPoint(previewVaultMigration());
  const point = readVaultSlot(ROLLBACK_KEY)!;
  useStore.getState().updateSettings({targetWeight:160}); await flushVault();
  await writeVaultSlot(DAILY_LOGS_KEY,null);
  await writeVaultSlot(CORRUPT_KEY,'new rescue');
  await writeVaultSlot(BACKUP_REMINDER_KEY,null);
  const edited = currentVaultSlots(); delete edited[ROLLBACK_KEY];
  await restoreRecoveryPoint(point); await useStore.persist.rehydrate();
  const restored = currentVaultSlots(); delete restored[ROLLBACK_KEY];
  expect(restored).toEqual(original);
  expect(useStore.getState().settings.targetWeight).toBe(170);
  expect(parseRecoveryPoint(readVaultSlot(ROLLBACK_KEY)!).slots).toEqual(edited);
  await restoreRecoveryPoint(readVaultSlot(ROLLBACK_KEY)!);
  const undone = currentVaultSlots(); delete undone[ROLLBACK_KEY]; expect(undone).toEqual(edited);
});

it('quota failures leave saved bytes and in-memory slots unchanged; a retry can succeed', async () => {
  const preview=previewVaultMigration(), before=currentVaultSlots(), raw=localStorage.getItem(VAULT_KEY);
  const set=Storage.prototype.setItem;
  const spy=vi.spyOn(Storage.prototype,'setItem').mockImplementation(function(this:Storage,k:string,v:string){if(k===VAULT_KEY)throw new DOMException('Full','QuotaExceededError');set.call(this,k,v);});
  await expect(saveMigrationRecoveryPoint(preview)).rejects.toThrow('Full');
  expect(localStorage.getItem(VAULT_KEY)).toBe(raw);expect(currentVaultSlots()).toEqual(before);
  spy.mockRestore();await saveMigrationRecoveryPoint(preview);
  const saved=localStorage.getItem(VAULT_KEY), slots=currentVaultSlots();
  const spy2=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('Full again');});
  await expect(restoreRecoveryPoint(readVaultSlot(ROLLBACK_KEY)!)).rejects.toThrow('Full again');
  expect(localStorage.getItem(VAULT_KEY)).toBe(saved);expect(currentVaultSlots()).toEqual(slots);spy2.mockRestore();
});

it('rejects stale previews, another-tab ciphertext changes and unsupported fields without replacing data',async()=>{
  const preview=previewVaultMigration();await writeVaultSlot(BACKUP_REMINDER_KEY,'changed');
  const raw=localStorage.getItem(VAULT_KEY);await expect(saveMigrationRecoveryPoint(preview)).rejects.toThrow(/changed after preview/);expect(localStorage.getItem(VAULT_KEY)).toBe(raw);
  const newPreview=previewVaultMigration();localStorage.setItem(VAULT_KEY,'another tab');await expect(saveMigrationRecoveryPoint(newPreview)).rejects.toThrow(/Vault changed/);expect(localStorage.getItem(VAULT_KEY)).toBe('another tab');localStorage.setItem(VAULT_KEY,raw!);
  const main=JSON.parse(readVaultSlot(STORAGE_KEY)!);main.state.futureRecords=[{note:'preserve'}];await writeVaultSlot(STORAGE_KEY,JSON.stringify(main));
  const unsupported=localStorage.getItem(VAULT_KEY);expect(()=>previewVaultMigration()).toThrow(/unsupported fields/);expect(localStorage.getItem(VAULT_KEY)).toBe(unsupported);
});

it('does not bypass an earlier failed write or silently accept concurrent edits during a transaction',async()=>{
  const preview=previewVaultMigration();
  const operation=saveMigrationRecoveryPoint(preview);
  await expect(writeVaultSlot(DAILY_LOGS_KEY,null)).rejects.toThrow(/recovery operation/);
  await operation;
  const raw=localStorage.getItem(VAULT_KEY);
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('Full');});
  await expect(writeVaultSlot(CORRUPT_KEY,'unsaved rescue')).rejects.toThrow('Full');
  await expect(saveMigrationRecoveryPoint(previewVaultMigration())).rejects.toThrow('Full');
  expect(localStorage.getItem(VAULT_KEY)).toBe(raw);expect(readVaultSlot(CORRUPT_KEY)).toBe('unsaved rescue');
});

it('erases the encrypted recovery generation along with all health history',async()=>{
  await saveMigrationRecoveryPoint(previewVaultMigration());useStore.getState().resetAllData();await flushVault();
  expect(readVaultSlot(ROLLBACK_KEY)).toBeNull();expect(readVaultSlot(DAILY_LOGS_KEY)).toBeNull();expect(readVaultSlot(CORRUPT_KEY)).toBeNull();
  const reopened=await openEncryptedVault(localStorage.getItem(VAULT_KEY)!,phrase);expect(reopened.slots[ROLLBACK_KEY]).toBeUndefined();
});

it('requires confirmation in the preview UI and retains a readable restore control when the flag is disabled',async()=>{
  vi.stubEnv('VITE_ENABLE_MIGRATION_PREVIEW','true');const rendered=render(<MigrationRecovery/>);
  fireEvent.click(screen.getByRole('button',{name:'Preview migration'}));expect(screen.getByText(/daily check-ins: 1/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Save encrypted recovery point'}));expect(readVaultSlot(ROLLBACK_KEY)).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Cancel'}));expect(readVaultSlot(ROLLBACK_KEY)).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Save encrypted recovery point'}));fireEvent.click(screen.getByRole('button',{name:'Save recovery point'}));
  await waitFor(()=>expect(screen.getByText(/Encrypted recovery point saved/)).toBeInTheDocument());
  rendered.unmount();vi.stubEnv('VITE_ENABLE_MIGRATION_PREVIEW','false');render(<MigrationRecovery/>);
  expect(screen.queryByRole('button',{name:'Preview migration'})).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Restore recovery point'}));fireEvent.click(screen.getByRole('button',{name:'Restore records'}));
  await waitFor(()=>expect(screen.getByText(/Saved records restored/)).toBeInTheDocument());
});

it('rejects unknown or recursively nested recovery slots and invalid daily envelopes',async()=>{
  const slots=currentVaultSlots();
  expect(()=>parseRecoveryPoint(JSON.stringify({format:'glp1-recovery-point',version:1,createdAt:'2026-10-07T00:00:00Z',reason:'migration-preview',slots:{...slots,[ROLLBACK_KEY]:'nested'}}))).toThrow(/Unsupported recovery slots/);
  await writeVaultSlot(DAILY_LOGS_KEY,JSON.stringify({format:'glp1-daily-logs',version:1,entries:[],futureField:'keep'}));
  const raw=localStorage.getItem(VAULT_KEY);expect(()=>previewVaultMigration()).toThrow(/Unsupported daily records/);expect(localStorage.getItem(VAULT_KEY)).toBe(raw);
});

it('rechecks saved bytes after encryption if a non-cooperating tab writes during the operation',async()=>{
  const preview=previewVaultMigration(), slots=currentVaultSlots();
  const encrypt=crypto.subtle.encrypt.bind(crypto.subtle);
  vi.spyOn(crypto.subtle,'encrypt').mockImplementation(async (...args:Parameters<typeof encrypt>)=>{
    const result=await encrypt(...args);localStorage.setItem(VAULT_KEY,'newer ciphertext');return result;
  });
  await expect(saveMigrationRecoveryPoint(preview)).rejects.toThrow(/changed during recovery/);
  expect(localStorage.getItem(VAULT_KEY)).toBe('newer ciphertext');expect(currentVaultSlots()).toEqual(slots);
});
