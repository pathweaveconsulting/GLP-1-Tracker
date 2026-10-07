import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useStore } from '../store/useStore';
import { seedStore } from './fixtures';
import { Doses } from '../pages/Doses';
import { Weight } from '../pages/Weight';
import { ToastProvider } from '../components/ui/Toast';
import { activatePreparedVault, discardVaultSession, flushVault, prepareVault } from '../lib/vault';
import { openEncryptedVault } from '../lib/vaultCrypto';
import { STORAGE_KEY, VAULT_KEY } from '../store/keys';
import { resumeWrites } from '../store/storage';
beforeEach(()=>{discardVaultSession();resumeWrites();seedStore('populated','kg');const s=useStore.getState();useStore.setState({doses:[{...s.doses[0],painLevel:null,notes:'Exact original note'}],weights:[{...s.weights[0],weightLbs:220.00012345}]});});
afterEach(async()=>{await flushVault().catch(()=>{});discardVaultSession();resumeWrites();vi.restoreAllMocks();vi.unstubAllGlobals();});
const showDoses=()=>render(<ToastProvider><Doses/></ToastProvider>);
function showWeights(){render(<ToastProvider><Weight/></ToastProvider>);fireEvent.click(screen.getByRole('button',{name:'Weight Log & Table'}));}
function deleteDose(){fireEvent.click(screen.getByRole('button',{name:/Delete .* injection from/}));return screen.getByRole('alertdialog',{name:'Delete injection log?'});}
function deleteWeight(){fireEvent.click(screen.getByRole('button',{name:/Delete weight entry from/}));return screen.getByRole('alertdialog',{name:'Delete weight entry?'});}
it('requires dose confirmation, Cancel preserves records, and undo preserves exact identity/time/notes and missing pain',()=>{
  const original=useStore.getState().doses[0];showDoses();let dialog=deleteDose();expect(useStore.getState().doses).toEqual([original]);fireEvent.click(within(dialog).getByRole('button',{name:'Cancel'}));expect(useStore.getState().doses).toEqual([original]);
  dialog=deleteDose();fireEvent.click(within(dialog).getByRole('button',{name:'Delete injection log'}));expect(useStore.getState().doses).toEqual([]);
  fireEvent.click(screen.getByRole('button',{name:'Undo last deletion'}));expect(useStore.getState().doses).toEqual([original]);
});
it('requires weight confirmation and undo retains exact stored pounds rather than rounded display kilograms',()=>{
  const original=useStore.getState().weights[0];showWeights();let dialog=deleteWeight();fireEvent.click(within(dialog).getByRole('button',{name:'Cancel'}));expect(useStore.getState().weights).toEqual([original]);
  dialog=deleteWeight();fireEvent.click(within(dialog).getByRole('button',{name:'Delete weight entry'}));expect(useStore.getState().weights).toEqual([]);
  fireEvent.click(screen.getByRole('button',{name:'Undo last deletion'}));expect(useStore.getState().weights).toEqual([original]);
});
it('does not delete a dose or weight that changed while its confirmation was open',()=>{
  const rendered=showDoses();const d=deleteDose();act(()=>useStore.getState().updateDose(useStore.getState().doses[0].id,{notes:'Changed while confirming'}));
  fireEvent.click(within(d).getByRole('button',{name:'Delete injection log'}));expect(useStore.getState().doses).toHaveLength(1);expect(screen.getByText(/This record changed/)).toBeInTheDocument();rendered.unmount();
  showWeights();const w=deleteWeight();act(()=>useStore.getState().updateWeight(useStore.getState().weights[0].id,{weightLbs:215}));fireEvent.click(within(w).getByRole('button',{name:'Delete weight entry'}));expect(useStore.getState().weights[0].weightLbs).toBe(215);
});
it('refuses duplicate-ID undo instead of overwriting a replacement record',()=>{
  const original=useStore.getState().doses[0];showDoses();fireEvent.click(within(deleteDose()).getByRole('button',{name:'Delete injection log'}));
  const replacement={...original,notes:'Replacement'};act(()=>useStore.setState({doses:[replacement]}));fireEvent.click(screen.getByRole('button',{name:'Undo last deletion'}));expect(useStore.getState().doses).toEqual([replacement]);expect(screen.getByText(/a record with this ID already exists/)).toBeInTheDocument();
  const weight=useStore.getState().weights[0];expect(useStore.getState().restoreWeight({...weight,weightLbs:190})).toBe(false);expect(useStore.getState().weights).toEqual([weight]);
});
it('only offers the latest deletion while this page stays mounted',()=>{
  const first=useStore.getState().doses[0],second={...first,id:'another',notes:'Second record'};useStore.setState({doses:[first,second]});const rendered=showDoses();
  fireEvent.click(screen.getAllByRole('button',{name:/Delete .* injection from/})[0]);fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'Delete injection log'}));
  fireEvent.click(within(deleteDose()).getByRole('button',{name:'Delete injection log'}));fireEvent.click(screen.getByRole('button',{name:'Undo last deletion'}));expect(useStore.getState().doses).toEqual([second]);
  fireEvent.click(within(deleteDose()).getByRole('button',{name:'Delete injection log'}));rendered.unmount();showDoses();expect(screen.queryByRole('button',{name:'Undo last deletion'})).toBeNull();
});
it('restores original tie order for equal timestamps instead of changing which weigh-in is latest',()=>{
  const first=useStore.getState().weights[0],second={...first,id:'same-time',weightLbs:210};useStore.setState({weights:[first,second]});
  showWeights();fireEvent.click(screen.getAllByRole('button',{name:/Delete weight entry from/})[0]);fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'Delete weight entry'}));
  fireEvent.click(screen.getByRole('button',{name:'Undo last deletion'}));expect(useStore.getState().weights).toEqual([first,second]);
});
it('persists restored dose and weight records in encrypted storage with their original IDs',async()=>{
  vi.stubGlobal('crypto',webcrypto);Object.defineProperty(navigator,'locks',{configurable:true,value:{request:async(_:string,callback:()=>unknown)=>callback()}});
  const phrase='violet orchard river mountain',d=useStore.getState().doses[0],w=useStore.getState().weights[0];await activatePreparedVault(await prepareVault(phrase));
  useStore.getState().deleteDose(d.id);useStore.getState().deleteWeight(w.id);await flushVault();
  expect(useStore.getState().restoreDose(d)).toBe(true);expect(useStore.getState().restoreWeight(w)).toBe(true);await flushVault();
  const opened=await openEncryptedVault(localStorage.getItem(VAULT_KEY)!,phrase),stored=JSON.parse(opened.slots[STORAGE_KEY]).state;
  expect(stored.doses).toEqual([d]);expect(stored.weights).toEqual([w]);expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
});
