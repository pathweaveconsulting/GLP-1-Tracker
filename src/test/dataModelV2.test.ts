import { afterEach, describe, expect, it } from 'vitest';
import { seedStore } from './fixtures';
import { useStore } from '../store/useStore';
import { STORAGE_KEY } from '../store/keys';
import { createSafeStorage, resumeWrites, storageReport } from '../store/storage';
import { STORE_VERSION, migrateStore } from '../store/migrate';
import { createBackup, createDataModelBackup, parseBackup } from '../lib/backup';
import { migrateDataModelV2, legacyDataFromV2, prepareDataModelMigration, validateDataModelV2 } from '../lib/dataModelV2';
afterEach(() => resumeWrites());
function snapshot() {
  seedStore('populated','kg');
  const {settings,doses,weights,effects}=useStore.getState();
  return {settings,doses,weights,effects,dailyLogs:[{date:'2026-01-05',proteinGrams:0,notes:'Private note'}]};
}
describe('versioned data foundation',()=>{
  it('is deterministic, reversible and preserves identity, exact timestamps, explicit none, absent ratings and zero totals',()=>{
    const data=snapshot();data.effects=[{id:'legacy',date:'2026-01-05T17:45:00.000Z',mood:'none',bloating:'severe',customEffects:{Headache:'none'},notes:'Legacy note'}];
    const original=JSON.stringify(data);const plan=prepareDataModelMigration(original);
    expect(plan.ok).toBe(true);if(!plan.ok)throw Error(plan.error);
    expect(plan.original).toBe(original);expect(JSON.stringify(data)).toBe(original);
    expect(prepareDataModelMigration(original)).toEqual(plan);
    expect(legacyDataFromV2(plan.data)).toEqual(data);
    expect(plan.data.checkIns[0]).not.toHaveProperty('waterMl');
    expect(plan.data.legacyEffects[0]).not.toHaveProperty('energy');
    expect(plan.data.metadata.provenance.legacyEffects[0]).toEqual({id:'legacy',createdAt:null,updatedAt:null,source:'legacy',importBatchId:null,externalIntegrationSource:null});
    expect(plan.data.checkIns).toHaveLength(1);expect(plan.data.legacyEffects).toHaveLength(1);
    expect(prepareDataModelMigration(plan.candidate)).toMatchObject({ok:true,candidate:plan.candidate});
  });
  it('retains original bytes on failure and rejects duplicates, invalid ratings and unknown fields rather than dropping them',()=>{
    const data=snapshot();
    for(const broken of [{...data,weights:[data.weights[0],data.weights[0]]},{...data,effects:[{id:'bad',date:'2026-01-05T12:00:00Z',nausea:'banana',notes:''}]},{...data,newDomain:[{secret:'keep'}]},{...data,doses:[{...data.doses[0],route:'oral'}]}]) {
      const original=JSON.stringify(broken);expect(prepareDataModelMigration(original)).toMatchObject({ok:false,original});
    }
    const original='{ damaged original';expect(prepareDataModelMigration(original)).toMatchObject({ok:false,original});
  });
  it('rejects unknown schema/provenance and nonempty reserved domains; does not invent missing legacy daily history',()=>{
    const {dailyLogs:_ignored,...data}=snapshot();const model=migrateDataModelV2(data);
    expect(legacyDataFromV2(model)).toEqual(data);expect(legacyDataFromV2(model)).not.toHaveProperty('dailyLogs');
    expect(()=>validateDataModelV2({...model,schemaVersion:3})).toThrow();
    expect(()=>validateDataModelV2({...model,supplies:[{id:'future'}]})).toThrow();
    expect(()=>validateDataModelV2({...model,metadata:{...model.metadata,newField:true}})).toThrow();
    expect(()=>validateDataModelV2({...model,metadata:{...model.metadata,dailyLogsPresent:false},checkIns:[{date:'2026-01-05',proteinGrams:1,notes:''}]})).toThrow();
  });
  it('round-trips versioned backups and preserves regular v1/v2 exports; rejects incompatible model data',()=>{
    const data=snapshot();const backup=createDataModelBackup(data,'0.0.0',new Date('2026-10-07T00:00:00Z'));
    expect(backup).toMatchObject({version:3,schemaVersion:2,appVersion:'0.0.0',exportedAt:'2026-10-07T00:00:00.000Z'});
    const parsed=parseBackup(JSON.stringify(backup));expect(parsed.ok).toBe(true);if(parsed.ok)expect(parsed.data).toEqual(data);
    expect(createBackup(data).version).toBe(2);const {dailyLogs:_ignored,...legacy}=data;expect(createBackup(legacy).version).toBe(1);
    expect(parseBackup(JSON.stringify({...backup,data:{...backup.data,reminders:[{id:'future'}]}})).ok).toBe(false);
    expect(parseBackup(JSON.stringify({...backup,schemaVersion:3})).ok).toBe(false);
  });
  it('blocks all ordinary writes and removal on unsupported stored versions before sanitization, preserving original bytes',async()=>{
    const data=snapshot();const adapter=createSafeStorage<unknown>();
    for(const version of [STORE_VERSION+1,999,-1,1.5,'1',null]) {
      const raw=JSON.stringify({state:{...data,weights:'future shape'},version});localStorage.setItem(STORAGE_KEY,raw);
      expect(await adapter.getItem(STORAGE_KEY)).toBeNull();expect(storageReport.readFailed).toBe(true);
      await adapter.setItem(STORAGE_KEY,{state:{},version:STORE_VERSION});await adapter.removeItem(STORAGE_KEY);
      expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
    }
    for (const state of [null, [], 'future document']) {
      const raw=JSON.stringify({version:STORE_VERSION+1,state});localStorage.setItem(STORAGE_KEY,raw);
      expect(await adapter.getItem(STORAGE_KEY)).toBeNull();await adapter.setItem(STORAGE_KEY,{state:{},version:STORE_VERSION});
      expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
    }
    expect(()=>migrateStore(data,STORE_VERSION+1)).toThrow(/Unsupported/);
    localStorage.setItem(STORAGE_KEY,JSON.stringify({state:{...data,hasOnboarded:true},version:STORE_VERSION}));expect(await adapter.getItem(STORAGE_KEY)).not.toBeNull();expect(storageReport.readFailed).toBe(false);
  });
});
