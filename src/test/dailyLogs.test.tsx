import { webcrypto } from 'node:crypto';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { activatePreparedVault, discardVaultSession, encryptedBackup, flushVault, lockVault, getLockedBackup, prepareVault, readVaultSlot, unlockVault, writeVaultSlot } from '../lib/vault';
import { DAILY_LOGS_KEY, VAULT_KEY, STORAGE_KEY } from '../store/keys';
import { dailyForm, parseDailyLogs, serializeDailyLogs, validateDailyRows } from '../lib/dailyLogs';
import { readDailyLogs, saveDailyLog } from '../store/dailyLogs';
import { decryptBackup } from '../lib/encryptedRestore';
import { createBackup, parseBackup } from '../lib/backup';
import { buildTidyCsv } from '../lib/tidyExport';
import { useStore } from '../store/useStore';
import { STORE_VERSION } from '../store/migrate';
import { seedStore } from './fixtures';
import { DailyLogs } from '../pages/DailyLogs';
const phrase='violet orchard river mountain';
beforeEach(()=>{discardVaultSession();vi.stubGlobal('crypto',webcrypto);Object.defineProperty(navigator,'locks',{configurable:true,value:{request:async (_:string,callback:()=>unknown)=>callback()}});});
afterEach(async()=>{await flushVault().catch(()=>{});discardVaultSession();vi.restoreAllMocks();vi.unstubAllGlobals();vi.unstubAllEnvs();});
const snapshot=()=>{const {settings,doses,weights,effects}=useStore.getState();return {settings,doses,weights,effects};};
async function setup(){seedStore('empty','kg');await activatePreparedVault(await prepareVault(phrase));}

describe('daily total fidelity',()=>{
  it('keeps blank fields distinct from zero and rejects duplicate days, invalid totals, empty logs and unsupported fields',()=>{
    expect(dailyForm('2026-01-05','0','','note')).toEqual({date:'2026-01-05',proteinGrams:0,notes:'note'});
    expect(()=>dailyForm('2026-01-05','','','')).toThrow();
    expect(()=>dailyForm('2026-01-05','NaN','','')).toThrow();
    expect(()=>dailyForm('2099-01-01','1','','')).toThrow();
    for(const waterMl of [NaN,Infinity,-1,100001,'4',null]) expect(()=>validateDailyRows([{date:'2026-01-05',waterMl,notes:''}])).toThrow();
    expect(()=>validateDailyRows([{date:'2026-02-30',proteinGrams:1,notes:''}])).toThrow();
    const row={date:'2026-01-05',waterMl:0,notes:'नमस्ते'};
    expect(parseDailyLogs(serializeDailyLogs([row]))).toEqual([row]);
    expect(()=>validateDailyRows([row,row])).toThrow(/unique/);
    expect(()=>validateDailyRows([{...row,newField:1}])).toThrow(/unsupported/);
  });
  it('updates one date rather than double-counting and restores encrypted totals without plaintext persistence',async()=>{
    await setup();await saveDailyLog({date:'2026-01-05',proteinGrams:0,notes:'Private daily note'});
    await saveDailyLog({date:'2026-01-05',waterMl:800.5,notes:'Updated private note'});
    const expected=[{date:'2026-01-05',waterMl:800.5,notes:'Updated private note'}];
    expect(readDailyLogs()).toEqual(expected);
    expect(localStorage.getItem(DAILY_LOGS_KEY)).toBeNull();expect(localStorage.getItem(VAULT_KEY)).not.toContain('Updated private note');
    const main=readVaultSlot(STORAGE_KEY)!;const raw=await encryptedBackup(main);
    const restored=await decryptBackup(raw,phrase);expect(restored.ok).toBe(true);if(restored.ok)expect(restored.data.dailyLogs).toEqual(expected);
    discardVaultSession();await unlockVault(phrase);expect(readDailyLogs()).toEqual(expected);
    const csv=buildTidyCsv({...snapshot(),dailyLogs:expected,unit:'kg'});expect(csv).toContain('Daily,2026-01-05,Water,800.5,mL');expect(csv).not.toContain(',Protein,0,');
    const parsed=parseBackup(JSON.stringify(createBackup({...snapshot(),dailyLogs:expected})));expect(parsed.ok).toBe(true);if(parsed.ok)expect(parsed.data.dailyLogs).toEqual(expected);
  });
  it('refuses to overwrite unreadable daily bytes and retains failed saves in an encrypted locked recovery snapshot',async()=>{
    await setup();await writeVaultSlot(DAILY_LOGS_KEY,'damaged original');
    await expect(saveDailyLog({date:'2026-01-05',proteinGrams:2,notes:''})).rejects.toThrow();expect(readVaultSlot(DAILY_LOGS_KEY)).toBe('damaged original');
    await writeVaultSlot(DAILY_LOGS_KEY,null);
    vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('Quota');});
    await expect(saveDailyLog({date:'2026-01-05',proteinGrams:2,notes:'Unsaved private daily'})).rejects.toThrow();
    const main=JSON.stringify({state:{...snapshot(),hasOnboarded:true},version:STORE_VERSION});
    expect(await lockVault(main)).toBe(true);const raw=getLockedBackup()!;expect(raw).not.toContain('Unsaved private daily');
    const restored=await decryptBackup(raw,phrase);expect(restored.ok).toBe(true);if(restored.ok)expect(restored.data.dailyLogs?.[0].notes).toBe('Unsaved private daily');
  });
  it('explicit restore from an older backup removes daily totals and reset removes the encrypted daily slot',async()=>{
    await setup();await saveDailyLog({date:'2026-01-05',proteinGrams:1,notes:''});
    useStore.getState().replaceAllData(snapshot());await flushVault();expect(readDailyLogs()).toEqual([]);
    await saveDailyLog({date:'2026-01-05',proteinGrams:1,notes:''});useStore.getState().resetAllData();await flushVault();expect(readVaultSlot(DAILY_LOGS_KEY)).toBeNull();
  });
  it('saves explicit zero while water stays unrecorded, then keeps history visible with the entry flag disabled',async()=>{
    await setup();vi.stubEnv('VITE_ENABLE_DAILY_LOGS','true');const user=userEvent.setup();const rendered=render(<DailyLogs/>);
    await user.type(screen.getByLabelText('Protein (g)'),'0');await user.click(screen.getByRole('button',{name:'Save daily totals'}));
    expect(await screen.findByRole('status')).toHaveTextContent('saved in your encrypted vault');expect(screen.getByText(/Protein: 0 g · Water: Not recorded/)).toBeInTheDocument();
    rendered.unmount();vi.stubEnv('VITE_ENABLE_DAILY_LOGS','false');render(<DailyLogs/>);expect(screen.queryByLabelText('Protein (g)')).toBeNull();expect(screen.getByText(/Protein: 0 g · Water: Not recorded/)).toBeInTheDocument();
  });
});
