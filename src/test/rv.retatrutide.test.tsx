import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { seedStore } from './fixtures';
import { open, ROUTES } from './helpers';
import { MEDICATION_INFO } from '../lib/medications';
import { calculateShotPhase, generatePKCurve } from '../lib/glp1Utils';
import { nextDoseInfo } from '../lib/insights';
import { useStore } from '../store/useStore';
import { buildNotifications } from '../lib/notifications';
import { buildRecommendations } from '../lib/recommendations';

afterEach(cleanup);

const NO_ESTIMATE = /No estimate available for this medication/;

describe('RV04b: Retatrutide has no modelled estimate', () => {
  it('the reference data carries no half-life or interval, and says it is not modelled', () => {
    const r = MEDICATION_INFO.Retatrutide;
    expect(r.modelled).toBe(false);
    expect(r.halfLifeDays).toBeNull();
    expect(r.intervalDays).toBeNull();
    expect(MEDICATION_INFO.Tirzepatide.modelled).toBe(true);
    expect(MEDICATION_INFO.Semaglutide.modelled).toBe(true);
    expect(MEDICATION_INFO.Other.modelled).toBe(false);
  });

  it('the models return nothing for a Retatrutide-only log: no level, no peak, no phase, no due date', () => {
    useStore.getState().resetAllData();
    seedStore('retatrutide', 'lbs');
    const doses = useStore.getState().doses;
    const level = generatePKCurve(doses, '3 months');
    expect(level.modelled).toBe(false);
    expect(level.currentLevel).toBe(0);
    expect(level.percentOfPeak).toBe(0);
    expect(level.points.every((p) => p.level === 0)).toBe(true);
    const phase = calculateShotPhase(doses);
    expect(phase.title).toBe('Schedule Not Tracked');
    expect(phase.phaseNumber).toBe(0);
    const next = nextDoseInfo(doses);
    expect(next.dueDate).toBeNull();
    expect(next.daysUntil).toBeNull();
  });

  it('notifications and recommendations raise no due / overdue dose item for a Retatrutide-only log', () => {
    seedStore('retatrutide', 'lbs');
    const st = useStore.getState();
    const args = { doses: st.doses.map((d) => ({ ...d, date: new Date(Date.now() - 12 * 86400000).toISOString() })), weights: st.weights, effects: st.effects, settings: st.settings };
    const items = [...buildNotifications(args), ...buildRecommendations(args)] as Array<{ id: string }>;
    expect(items.map((i) => i.id).filter((id) => /dose/i.test(id))).toEqual([]);
  });

  for (const path of ROUTES) {
    for (const unit of ['lbs', 'kg'] as const) {
      it(`${path} [Retatrutide-only log, ${unit}]: no NaN/undefined, no due date or level numbers`, async () => {
        seedStore('retatrutide', unit);
        await open(path);
        const text = document.querySelector('main')!.textContent ?? '';
        expect(text).not.toMatch(/NaN|Infinity|undefined|\[object Object\]/);
        expect(text).not.toMatch(/Next shot due|% of peak|of your peak|mg in your system/i);
      });
    }
  }

  it('the home page and the level chart say "No estimate available for this medication" with the investigational note', async () => {
    seedStore('retatrutide', 'lbs');
    await open('/');
    const main = document.querySelector('main') as HTMLElement;
    expect(main.textContent).toMatch(NO_ESTIMATE);
    expect(main.textContent).toMatch(/investigational/i);
  });

  it('the dose form and onboarding show the same note when Retatrutide is chosen', async () => {
    seedStore('populated', 'lbs');
    const user = userEvent.setup();
    await open('/doses');
    await user.click(screen.getByRole('button', { name: /record injection/i }));
    const dialog = screen.getByRole('dialog', { name: /log shot/i });
    expect(within(dialog).queryByText(NO_ESTIMATE)).not.toBeInTheDocument();
    await user.selectOptions(within(dialog).getByLabelText(/^medication/i), 'Retatrutide');
    expect(within(dialog).getByText(NO_ESTIMATE)).toBeInTheDocument();
    expect(within(dialog).getByText(/investigational/i)).toBeInTheDocument();
  });
});

describe('RV04a: missed-dose wording grants no late or extra dose', () => {
  const NEW_TEXT = 'Missed-dose instructions depend on your exact product. Check your leaflet or ask your pharmacist. This app does not tell you to take a late or extra dose.';
  for (const med of ['Tirzepatide', 'Semaglutide'] as const) {
    it(`${med}: the exact requested text, with no day counts and no "can be taken"`, () => {
      const note = MEDICATION_INFO[med].missedDoseNote;
      expect(note).toBe(NEW_TEXT);
      expect(note).not.toMatch(/\d\s*(days?|hours?)|96|can be taken|skip/i);
    });
  }
});
