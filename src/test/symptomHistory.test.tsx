import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Effects } from '../pages/Effects';
import { useStore } from '../store/useStore';
import { seedStore } from './fixtures';
import type { EffectEntry } from '../types';
vi.mock('../components/SideEffectsAnalyticsDashboard', () => ({ SideEffectsAnalyticsDashboard: () => <div>Analytics</div> }));
const original: EffectEntry = {id:'legacy-symptom', date:'2026-01-05T17:45:00.000Z', bloating:'moderate', mood:'none', insomnia:'mild', customEffects:{Headache:'none'}, notes:'Original note'};
beforeEach(() => { seedStore('empty', 'kg'); useStore.setState({effects:[structuredClone(original)]}); });
describe('symptom history safety', () => {
  it('displays all recorded fields, including explicit none and legacy ratings', async () => {
    const user=userEvent.setup(); render(<Effects/>); await user.click(screen.getByRole('button',{name:'Symptom Log History'}));
    for(const text of ['Bloating: moderate','Mood: none','Insomnia: mild','Headache: none']) expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByText('Nausea: none')).toBeNull();
  });
  it('editing notes retains timestamp, identity, legacy and custom ratings; clearing means not recorded', async () => {
    const user=userEvent.setup();render(<Effects/>);await user.click(screen.getByRole('button',{name:'Symptom Log History'}));
    await user.click(screen.getByRole('button',{name:/Edit symptom log/}));
    const notes=screen.getByLabelText('Notes & reflections');await user.clear(notes);await user.type(notes,'Corrected note');
    const group=screen.getByRole('group',{name:'Bloating'});await user.click(within(group).getByRole('button',{name:'Not recorded'}));
    await user.click(screen.getByRole('button',{name:'Save Log'}));
    const entry=useStore.getState().effects[0];expect(entry).toEqual({...original,bloating:undefined,notes:'Corrected note'});
    expect(useStore.getState().effects).toHaveLength(1);
  });
  it('cancel preserves the entry; confirmed deletion can be undone without changing or duplicating it', async () => {
    const user=userEvent.setup();render(<Effects/>);await user.click(screen.getByRole('button',{name:'Symptom Log History'}));
    await user.click(screen.getByRole('button',{name:/Delete symptom log/}));await user.click(screen.getByRole('button',{name:'Cancel'}));expect(useStore.getState().effects).toEqual([original]);
    await user.click(screen.getByRole('button',{name:/Delete symptom log/}));await user.click(screen.getByRole('button',{name:'Delete log'}));expect(useStore.getState().effects).toEqual([]);expect(screen.getByText(/No symptom logs yet/)).toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:'Undo last deletion'}));expect(useStore.getState().effects).toEqual([original]);
    useStore.getState().restoreEffect({...original,notes:'Would overwrite'});expect(useStore.getState().effects).toEqual([original]);
  });
});
