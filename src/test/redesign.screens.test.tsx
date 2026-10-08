import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within, act } from '@testing-library/react';
import { useStore } from '../store/useStore';
import { seedStore, isoDaysAgo } from './fixtures';
import { open } from './helpers';
import { AllLogs } from '../pages/AllLogs';
import { ToastProvider } from '../components/ui/Toast';

afterEach(cleanup);
const showLogs = () => render(<ToastProvider><AllLogs /></ToastProvider>);

describe('All history deletes with the same safeguards as Medication and Progress', () => {
  it('a dose needs confirmation; Cancel keeps it; undo restores the exact record', () => {
    seedStore('populated', 'kg');
    const before = useStore.getState().doses;
    showLogs();
    fireEvent.click(screen.getAllByRole('button', { name: /Delete .* dose from/ })[0]);
    const dialog = screen.getByRole('alertdialog', { name: 'Delete injection log?' });
    expect(useStore.getState().doses).toEqual(before);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(useStore.getState().doses).toEqual(before);
    fireEvent.click(screen.getAllByRole('button', { name: /Delete .* dose from/ })[0]);
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete injection log' }));
    expect(useStore.getState().doses).toHaveLength(before.length - 1);
    fireEvent.click(screen.getByRole('button', { name: 'Undo last deletion' }));
    expect(useStore.getState().doses).toEqual(before);
  });

  it('a weight that changed while the confirmation was open is not deleted', () => {
    seedStore('populated', 'kg');
    showLogs();
    fireEvent.click(screen.getByRole('button', { name: /^Weight \(/ }));
    fireEvent.click(screen.getAllByRole('button', { name: /Delete weight entry from/ })[0]);
    const target = useStore.getState().weights.reduce((a, b) => (new Date(a.date) > new Date(b.date) ? a : b));
    act(() => useStore.getState().updateWeight(target.id, { weightLbs: 215 }));
    fireEvent.click(within(screen.getByRole('alertdialog', { name: 'Delete weight entry?' })).getByRole('button', { name: 'Delete weight entry' }));
    expect(useStore.getState().weights.find((w) => w.id === target.id)?.weightLbs).toBe(215);
    expect(screen.getByText(/This record changed/)).toBeInTheDocument();
  });

  it('an unrated symptom shows "Not recorded", never a blank or "none"', () => {
    seedStore('empty', 'lbs');
    useStore.setState({ effects: [{ id: 'e', date: isoDaysAgo(0), hunger: 'mild', notes: '' }] });
    showLogs();
    fireEvent.click(screen.getByRole('button', { name: /^Effects/ }));
    const row = screen.getAllByRole('row')[1];
    expect(row).toHaveTextContent('Mild');
    expect(within(row).getAllByText('Not recorded')).toHaveLength(2);
  });
});

describe('redesigned screens keep one h1 and honest controls', () => {
  for (const path of ['/weight', '/doses', '/effects', '/results', '/results?tab=progress', '/this-week', '/health', '/reports', '/recommendations', '/calendar', '/logs']) {
    it(`${path} has exactly one h1`, async () => {
      seedStore('populated', 'lbs');
      await open(path);
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    });
  }

  it('Insights progress view no longer offers a time filter that changed nothing', async () => {
    seedStore('populated', 'lbs');
    await open('/results?tab=progress');
    expect(screen.queryByRole('button', { name: '90d' })).toBeNull();
  });
});
