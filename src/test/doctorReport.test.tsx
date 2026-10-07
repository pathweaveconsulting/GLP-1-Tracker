import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { DoctorRecords, recordedRatings } from '../components/DoctorRecords';
import { Reports } from '../pages/Reports';
import { periodFor } from '../lib/reports';
import { useStore } from '../store/useStore';
import { seedStore } from './fixtures';
import type { EffectEntry } from '../types';

afterEach(() => vi.unstubAllEnvs());
const inside = new Date(2026, 9, 7, 12).toISOString();
const outside = new Date(2026, 8, 7, 12).toISOString();
const effect: EffectEntry = {id:'e1',date:inside,nausea:'none',fatigue:'severe',insomnia:'none',customEffects:{'Personal symptom':'mild'},notes:'My own note\nSecond line'};

describe('clinician record fidelity', () => {
  it('retains explicit none, optional none and custom ratings without inventing unanswered ratings', () => {
    const ratings = recordedRatings(effect);
    expect(ratings).toContainEqual(['Nausea','None']);
    expect(ratings).toContainEqual(['Insomnia','None']);
    expect(ratings).toContainEqual(['Custom: Personal symptom','Mild']);
    expect(ratings.some(([key]) => key === 'Hunger')).toBe(false);
  });
  it('includes individual entries and notes, filters the period and labels unknown pain distinctly from zero', () => {
    seedStore('empty','kg');
    render(<DoctorRecords settings={useStore.getState().settings} range={periodFor('monthly', new Date(2026,9,7))}
      weights={[{id:'w1',date:inside,weightLbs:220},{id:'old',date:outside,weightLbs:170}]}
      doses={[{id:'d1',date:inside,medication:'Other',amountMg:1,site:'My site',painLevel:null,notes:'Dose note'},{id:'d2',date:inside,medication:'Other',amountMg:2,site:'My site',painLevel:0,notes:''}]}
      effects={[effect,{...effect,id:'e2',nausea:'severe',notes:'Another entry'},{...effect,id:'old',date:outside,notes:'Excluded note'}]} />);
    expect(screen.getByRole('heading',{name:'Weigh-ins (1)'})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:'Individual symptom logs (2)'})).toBeInTheDocument();
    expect(screen.getByText('Injection-site discomfort: Not recorded')).toBeInTheDocument();
    expect(screen.getByText('Injection-site discomfort: 0/10 (self-reported)')).toBeInTheDocument();
    expect(screen.getByText(/Notes: My own note/)).toHaveTextContent('Second line');
    expect(screen.getByText('Notes: Another entry')).toBeInTheDocument();
    expect(screen.queryByText(/Excluded note/)).toBeNull();
    expect(screen.getByText(/timezone:/)).toHaveTextContent(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(screen.getByText(/printed\/PDF copy is unencrypted/)).toBeInTheDocument();
  });
  it('keeps notes opt-in and opens the native print dialog without claiming a saved PDF', async () => {
    vi.stubEnv('VITE_ENABLE_DOCTOR_REPORT','true'); seedStore('empty','kg');
    const print=vi.spyOn(window,'print').mockImplementation(() => {});
    render(<BrowserRouter><Reports /></BrowserRouter>);
    expect(screen.queryByRole('heading',{name:'Records to discuss with your clinician'})).toBeNull();
    await userEvent.setup().click(screen.getByRole('checkbox'));
    expect(screen.getByRole('heading',{name:'Records to discuss with your clinician'})).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button',{name:'Print / save PDF'}));
    expect(print).toHaveBeenCalledOnce(); print.mockRestore();
  });
  it('hides the enhancement when the preview feature flag is off', () => {
    vi.stubEnv('VITE_ENABLE_DOCTOR_REPORT','false');seedStore('empty','lbs');
    render(<BrowserRouter><Reports /></BrowserRouter>);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});
