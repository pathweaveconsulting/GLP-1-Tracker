import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { StorageNotices } from '../components/StorageNotices';
import { SideEffectsAnalyticsDashboard } from '../components/SideEffectsAnalyticsDashboard';
import { useStore, STORAGE_KEY, CORRUPT_KEY } from '../store/useStore';
import { buildPopulated } from './fixtures';
import { importWeightsCsv } from '../lib/weightImport';
import { doseSymptomComparison, symptomOverview } from '../lib/sideEffectsAnalytics';
import { recentSymptomSummary } from '../lib/symptoms';
import { dateOnlyToIso } from '../lib/dates';
import { MemoryRouter } from 'react-router-dom';

const effect = (id: string, day: string, extra = {}) => ({ ...buildPopulated().effects[0], id, date: dateOnlyToIso(day), nausea: 'none' as const, ...extra });
afterEach(() => vi.restoreAllMocks());

describe('release data regressions', () => {
  it('shows malformed table recovery without discarding valid weights or claiming the app started empty', async () => {
    const validWeight = { id: 'valid', date: dateOnlyToIso('2026-01-01'), weightLbs: 220 };
    const raw = JSON.stringify({ version: 1, state: { doses: { invalid: true }, weights: [validWeight], effects: [], hasOnboarded: true } });
    localStorage.setItem(STORAGE_KEY, raw);
    await useStore.persist.rehydrate();
    render(<StorageNotices />);
    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent(/some saved data couldn.t be read/i);
    expect(notice).not.toHaveTextContent(/started empty/i);
    expect(within(notice).getByRole('button', { name: 'Download original data' })).toBeInTheDocument();
    expect(localStorage.getItem(CORRUPT_KEY)).toBe(raw);
    expect(useStore.getState().weights).toEqual([validWeight]);
    useStore.getState().dismissSkippedNotice();
  });

  it('rejects future local days while accepting today, including noon later today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 2, 0, 15));
    try {
      const r = importWeightsCsv('Date,WeightKg\n2026-01-01,100\n2026-01-02,99\n2026-01-03,98', { existing: [], defaultUnit: 'lbs' });
      expect(r.skipped).toBe(1);
      expect(r.rows.map(w => w.date)).toEqual([dateOnlyToIso('2026-01-01'), dateOnlyToIso('2026-01-02')]);
      expect(r.rows[1].weightLbs).toBeCloseTo(99 * 2.2046226, 3);
    } finally { vi.useRealTimers(); }
  });

  it('keeps identical numeric strengths of different drugs separate', () => {
    const template = buildPopulated().doses[0];
    const doses = [
      { ...template, id: 's', date: dateOnlyToIso('2026-01-01'), medication: 'Semaglutide' as const, amountMg: 1 },
      { ...template, id: 't', date: dateOnlyToIso('2026-01-08'), medication: 'Tirzepatide' as const, amountMg: 1 },
    ];
    const effects = [effect('s', '2026-01-01', { nausea: 'mild' }), effect('t', '2026-01-08', { nausea: 'severe' })];
    const comparison = doseSymptomComparison(effects, doses);
    expect(comparison.doses).toEqual([{ label: 'Semaglutide 1 mg', logs: 1 }, { label: 'Tirzepatide 1 mg', logs: 1 }]);
    expect(comparison.symptoms.find(s => s.symptom === 'Nausea')).toMatchObject({ 'Semaglutide 1 mg': 1, 'Tirzepatide 1 mg': 3 });
  });

  it('counts local days and uses the daily peak without modifying source entries', () => {
    const effects = [effect('a', '2026-01-01', { nausea: 'mild', customEffects: { Headache: 'moderate' } }), effect('b', '2026-01-01', { nausea: 'severe' }), effect('c', '2026-01-02')];
    const before = JSON.stringify(effects);
    const rows = symptomOverview(effects);
    expect(rows.find(r => r.key === 'nausea')).toMatchObject({ daysPresent: 1, daysLogged: 2, avgWhenPresent: 3, peak: 'severe', trend: null });
    expect(rows.find(r => r.key === 'custom:Headache')).toMatchObject({ daysPresent: 1, daysLogged: 2, peak: 'moderate' });
    const summary = recentSymptomSummary(effects, new Date(2026, 0, 2, 18));
    expect(summary.daysLogged).toBe(2);
    expect(summary.items.find(r => r.key === 'nausea')?.daysPresent).toBe(1);
    expect(JSON.stringify(effects)).toBe(before);
  });

  it('six same-day entries do not unlock a trend', () => {
    const effects = Array.from({ length: 6 }, (_, i) => effect(String(i), '2026-01-01', { nausea: i < 3 ? 'severe' : 'none' }));
    expect(symptomOverview(effects).find(r => r.key === 'nausea')).toMatchObject({ daysPresent: 1, daysLogged: 1, trend: null });
  });

  it('dashboard day cards and trend wording use distinct days', () => {
    const effects = Array.from({ length: 6 }, (_, i) => effect(String(i), '2026-01-01', { nausea: 'moderate' }));
    useStore.setState({ effects, doses: [] });
    const { container } = render(<MemoryRouter><SideEffectsAnalyticsDashboard /></MemoryRouter>);
    expect(container).toHaveTextContent(/fewer than 6 logged days/i);
    expect(container).toHaveTextContent(/1 of 1 days/i);
    expect(screen.getByText('Days logged').parentElement).toHaveTextContent(/^Days logged1$/);
    expect(screen.getByText('Days with a moderate or severe symptom').parentElement).toHaveTextContent(/symptom1$/);
  });
});
