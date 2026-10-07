import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { activatePreparedVault, currentVaultSlots, discardVaultSession, flushVault, prepareVault, readVaultSlot, unlockVault, writeVaultSlot } from '../lib/vault';
import { backupRestoreBaseline, parseRecoveryPoint, restoreBackupWithRecovery, restoreRecoveryPoint } from '../lib/vaultRecovery';
import { serializeDailyLogs, parseDailyLogs } from '../lib/dailyLogs';
import { createBackup, type BackupData } from '../lib/backup';
import { DAILY_LOGS_KEY, ROLLBACK_KEY, STORAGE_KEY, VAULT_KEY, CORRUPT_KEY } from '../store/keys';
import { useStore } from '../store/useStore';
import { resumeWrites } from '../store/storage';
import { seedStore } from './fixtures';
import { Settings } from '../pages/Settings';
import { ToastProvider } from '../components/ui/Toast';
const phrase='violet orchard river mountain';
let imported:BackupData;
beforeEach(async()=>{
  discardVaultSession();resumeWrites();vi.stubGlobal('crypto',webcrypto);
  Object.defineProperty(navigator,'locks',{configurable:true,value:{request:async(_:string,callback:()=>unknown)=>callback()}});
  seedStore('populated','kg');
  const {settings,doses,weights,effects}=useStore.getState();
  imported={settings:{...settings,targetWeight:160},doses:doses.slice(0,1),weights:weights.slice(0,2),effects:effects.slice(0,3),dailyLogs:[{date:'2026-10-01',waterMl:0,notes:'Imported; protein missing'}]};
  await activatePreparedVault(await prepareVault(phrase));
  await writeVaultSlot(DAILY_LOGS_KEY,serializeDailyLogs([{date:'2026-09-01',proteinGrams:0,notes:'Original; water missing'}]));
  await writeVaultSlot(CORRUPT_KEY,'exact rescue');
});
afterEach(async()=>{await flushVault().catch(()=>{});discardVaultSession();resumeWrites();vi.restoreAllMocks();vi.unstubAllGlobals();});

it('commits imported main and daily records with exact pre-import recovery, surviving lock/unlock and undo',async()=>{
  const baseline=backupRestoreBaseline(),original=currentVaultSlots();
  await restoreBackupWithRecovery(imported,baseline);
  const point=readVaultSlot(ROLLBACK_KEY)!;
  expect(parseRecoveryPoint(point)).toMatchObject({reason:'backup-import',slots:original});
  expect(JSON.parse(readVaultSlot(STORAGE_KEY)!).state).toEqual({...imported,dailyLogs:undefined,hasOnboarded:true});
  expect(parseDailyLogs(readVaultSlot(DAILY_LOGS_KEY))).toEqual(imported.dailyLogs);
  expect(localStorage.getItem(VAULT_KEY)).not.toContain('Original; water missing');
  expect(readVaultSlot(CORRUPT_KEY)).toBe('exact rescue');
  discardVaultSession();await unlockVault(phrase);expect(readVaultSlot(ROLLBACK_KEY)).toBe(point);
  await restoreRecoveryPoint(point);await useStore.persist.rehydrate();
  const restored=currentVaultSlots();delete restored[ROLLBACK_KEY];expect(restored).toEqual(original);expect(useStore.getState().settings.targetWeight).toBe(170);
});
it('quota failure preserves every original slot, ciphertext, previous recovery point and visible profile',async()=>{
  await restoreBackupWithRecovery(imported,backupRestoreBaseline());
  const slots=currentVaultSlots(),raw=localStorage.getItem(VAULT_KEY),visible=useStore.getState().settings;
  const spy=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new DOMException('Storage full','QuotaExceededError');});
  await expect(restoreBackupWithRecovery({...imported,weights:[]},backupRestoreBaseline())).rejects.toThrow('Storage full');
  expect(currentVaultSlots()).toEqual(slots);expect(localStorage.getItem(VAULT_KEY)).toBe(raw);expect(useStore.getState().settings).toEqual(visible);spy.mockRestore();
});
it('rejects stale approved previews and another-tab changes without overwriting them',async()=>{
  const baseline=backupRestoreBaseline();await writeVaultSlot(CORRUPT_KEY,'new rescue');
  const raw=localStorage.getItem(VAULT_KEY);await expect(restoreBackupWithRecovery(imported,baseline)).rejects.toThrow(/changed after/);expect(localStorage.getItem(VAULT_KEY)).toBe(raw);
  const next=backupRestoreBaseline();localStorage.setItem(VAULT_KEY,'newer tab bytes');await expect(restoreBackupWithRecovery(imported,next)).rejects.toThrow(/Vault changed/);expect(localStorage.getItem(VAULT_KEY)).toBe('newer tab bytes');
});
it('an old backup clears daily history atomically, retains its original bytes for undo, and never nests recovery history',async()=>{
  await restoreBackupWithRecovery(imported,backupRestoreBaseline());
  const before=currentVaultSlots(),{dailyLogs:_omitted,...legacy}=imported;
  await restoreBackupWithRecovery(legacy,backupRestoreBaseline());expect(readVaultSlot(DAILY_LOGS_KEY)).toBeNull();
  const point=parseRecoveryPoint(readVaultSlot(ROLLBACK_KEY)!);expect(point.slots[DAILY_LOGS_KEY]).toBe(before[DAILY_LOGS_KEY]);expect(point.slots[ROLLBACK_KEY]).toBeUndefined();
});
it('rejects unsupported current data and invalid/unknown incoming fields before any replacement',async()=>{
  const raw=localStorage.getItem(VAULT_KEY);
  expect(()=>restoreBackupWithRecovery({...imported,weights:[imported.weights[0],imported.weights[0]]},backupRestoreBaseline())).toThrow(/duplicate/);
  expect(()=>restoreBackupWithRecovery({...imported,futureNotes:['keep']} as BackupData,backupRestoreBaseline())).toThrow(/unsupported fields/);
  expect(localStorage.getItem(VAULT_KEY)).toBe(raw);
  const main=JSON.parse(readVaultSlot(STORAGE_KEY)!);main.version=999;await writeVaultSlot(STORAGE_KEY,JSON.stringify(main));const newer=localStorage.getItem(VAULT_KEY);
  await expect(restoreBackupWithRecovery(imported,backupRestoreBaseline())).rejects.toThrow(/Unsupported saved store/);expect(localStorage.getItem(VAULT_KEY)).toBe(newer);
});
async function previewInSettings(){
  render(<ToastProvider><Settings/></ToastProvider>);
  fireEvent.change(screen.getByLabelText(/choose a backup file/i),{target:{files:[new File([JSON.stringify(createBackup(imported))],'backup.json',{type:'application/json'})]}});
  return screen.findByRole('alertdialog',{name:/Replace your current data/});
}
it('UI confirms before replacing and reports success only after the encrypted commit and rehydration',async()=>{
  const original=currentVaultSlots();const dialog=await previewInSettings();expect(dialog).toHaveTextContent(/one encrypted recovery point/);expect(currentVaultSlots()).toEqual(original);
  fireEvent.click(within(dialog).getByRole('button',{name:'Replace my data'}));
  await waitFor(()=>expect(screen.getByText(/Backup restored. Your previous saved records/)).toBeInTheDocument());
  expect(useStore.getState().settings.targetWeight).toBe(160);expect(parseRecoveryPoint(readVaultSlot(ROLLBACK_KEY)!).slots).toEqual(original);
});
it('UI failed save never replaces the visible records or claims restoration succeeded',async()=>{
  const original=currentVaultSlots(),visible=useStore.getState().weights,raw=localStorage.getItem(VAULT_KEY);
  const dialog=await previewInSettings();vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('Full');});
  fireEvent.click(within(dialog).getByRole('button',{name:'Replace my data'}));
  const failure=await screen.findByRole('dialog',{name:/backup can.t be restored/});expect(failure).toHaveTextContent('Nothing was changed.');expect(failure).toHaveTextContent('Full');
  expect(screen.queryByText(/Backup restored/)).toBeNull();expect(currentVaultSlots()).toEqual(original);expect(localStorage.getItem(VAULT_KEY)).toBe(raw);expect(useStore.getState().weights).toEqual(visible);
});
