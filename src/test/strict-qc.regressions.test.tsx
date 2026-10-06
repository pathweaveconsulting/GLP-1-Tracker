import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogEffectsModal } from '../components/modals/LogEffectsModal';
import { useStore } from '../store/useStore';
import { seedStore } from './fixtures';
import { createBackup, parseBackup } from '../lib/backup';
import { checkEffect } from '../lib/rowValidation';
import { symptomOverview, symptomHeatmap, appetiteTrend, injectionDetail, recoveryPattern } from '../lib/sideEffectsAnalytics';
import { dailySymptomEntries, recentSymptomSummary } from '../lib/symptoms';
import { buildTidyRows } from '../lib/tidyExport';
import { dateOnlyToIso } from '../lib/dates';
import type { EffectEntry, DoseEvent } from '../types';

const log = (id: string, day: string, extra: Partial<EffectEntry> = {}): EffectEntry => ({id, date: dateOnlyToIso(day), notes: '', ...extra});
const dose: DoseEvent = {id:'d',date:dateOnlyToIso('2026-01-01'),medication:'Other',amountMg:1,site:'',painLevel:null,notes:''};

describe('strict QC: unrecorded is not none', () => {
  it('saves only selected form ratings, including explicit None, and never the six hidden fields', async () => {
    seedStore('empty', 'kg');
    render(<LogEffectsModal isOpen onClose={() => {}} />);
    const user = userEvent.setup();
    expect(screen.queryAllByRole('button', {pressed: true})).toHaveLength(0);
    for (const name of ['Cravings','Mood','Energy','Dehydration','Indigestion','Insomnia']) expect(screen.queryByRole('group',{name})).toBeNull();
    await user.click(within(screen.getByRole('group',{name:'Nausea'})).getByRole('button',{name:'Severe'}));
    await user.click(within(screen.getByRole('group',{name:'Hunger level'})).getByRole('button',{name:'None'}));
    await user.click(screen.getByRole('button',{name:'Save Log'}));
    const entry = useStore.getState().effects[0];
    expect(entry).toMatchObject({nausea:'severe',hunger:'none'});
    expect(Object.keys(entry).sort()).toEqual(['id','date','notes','customEffects','nausea','hunger'].sort());
  });

  it('preserves absent fields, explicit none and ratings through JSON backup, restore and rehydration', async () => {
    seedStore('empty','kg');
    const effects = [log('e','2026-01-01',{nausea:'none',dehydration:'severe'})];
    const parsed = parseBackup(JSON.stringify(createBackup({settings:useStore.getState().settings,doses:[],weights:[],effects})));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error('Backup rejected');
    expect(parsed.data.effects).toEqual(effects);
    useStore.getState().replaceAllData(parsed.data);
    useStore.setState({effects:[]});
    // Restore again to persist before rehydrating; no fallback defaults may be added.
    useStore.getState().replaceAllData(parsed.data);
    await useStore.persist.rehydrate();
    expect(useStore.getState().effects).toEqual(effects);
    const invalid = checkEffect({...effects[0],insomnia:'banana'});
    expect(invalid.ok && invalid.row.insomnia).toBeUndefined();
  });

  it('excludes unrecorded days from symptom denominators, trends, means and heatmap cells', () => {
    const effects = [log('a','2026-01-01',{dehydration:'severe',nausea:'severe',hunger:'moderate'}), log('b','2026-02-01'), log('c','2026-03-01',{dehydration:'none',nausea:'none'})];
    expect(symptomOverview(effects).find(r=>r.key==='dehydration')).toMatchObject({daysPresent:1,daysLogged:2,trend:null});
    expect(symptomHeatmap(effects,'months').rows.find(r=>r.label==='Dehydration')?.cells).toEqual(['severe',null,'none']);
    expect(appetiteTrend(effects).map(p=>p.hunger)).toEqual([2,null,null]);
    expect(recoveryPattern([effects[0],log('x','2026-01-02')],[dose])[0].avg).toBe(3);
    const detail=injectionDetail([effects[0],log('x','2026-01-02')],[dose],'d');
    expect(detail.averages.find(r=>r.label==='Nausea')?.avg).toBe(3);
    expect(detail.averages.find(r=>r.label==='Fatigue')?.avg).toBeNull();
    const summary=recentSymptomSummary([log('a','2026-01-01',{nausea:'severe'}),log('b','2026-01-02')],new Date(2026,0,2,18));
    expect(summary.items.find(r=>r.key==='nausea')).toMatchObject({daysPresent:1,daysRecorded:1,latest:undefined});
  });

  it('merges same-day explicitly recorded none without filling other fields or mutating originals', () => {
    const effects=[log('a','2026-01-01'),log('b','2026-01-01',{nausea:'none',customEffects:{Headache:'none'}})];
    const before=JSON.stringify(effects);
    expect(dailySymptomEntries(effects)).toEqual([{...effects[0],nausea:'none',customEffects:{Headache:'none'}}]);
    expect(JSON.stringify(effects)).toBe(before);
  });

  it('CSV distinguishes explicitly rated None from an unanswered log', () => {
    const rows=buildTidyRows({doses:[],weights:[],effects:[log('a','2026-01-01',{nausea:'none'}),log('b','2026-01-02')],unit:'kg'});
    expect(rows.map(r=>[r[2],r[3]])).toEqual([['Nausea','None'],['Symptoms','Not recorded']]);
  });
});
