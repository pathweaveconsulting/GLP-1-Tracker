import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Onboarding } from '../pages/Onboarding';
import { useStore } from '../store/useStore';

afterEach(() => {
  cleanup();
  useStore.getState().resetAllData();
});

describe('R4: Onboarding unit toggle converts what was already typed', () => {
  const start = () => screen.getByLabelText(/Starting weight/) as HTMLInputElement;

  it('90 kg -> lbs -> kg comes back to 90 (within 0.01)', async () => {
    useStore.getState().resetAllData();
    const user = userEvent.setup();
    render(<Onboarding />);
    await user.click(screen.getByRole('button', { name: 'kg' }));
    await user.type(start(), '90');
    await user.click(screen.getByRole('button', { name: 'lbs' }));
    expect(Number(start().value)).toBeCloseTo(198.42, 1);
    await user.click(screen.getByRole('button', { name: 'kg' }));
    expect(Math.abs(Number(start().value) - 90)).toBeLessThanOrEqual(0.01);
  });

  it('converts the goal weight too, and leaves blank fields blank', async () => {
    useStore.getState().resetAllData();
    const user = userEvent.setup();
    render(<Onboarding />);
    await user.click(screen.getByRole('button', { name: 'kg' }));
    await user.type(screen.getByLabelText(/Goal weight/), '70');
    await user.click(screen.getByRole('button', { name: 'lbs' }));
    expect(Number((screen.getByLabelText(/Goal weight/) as HTMLInputElement).value)).toBeCloseTo(154.32, 1);
    expect(start().value).toBe('');
  });

  it('typing 90 in kg, ending on lbs, then saving stores about 198.4 lb, not 90 lb', async () => {
    useStore.getState().resetAllData();
    const user = userEvent.setup();
    render(<Onboarding />);
    await user.click(screen.getByRole('button', { name: 'kg' }));
    await user.type(start(), '90');
    await user.type(screen.getByLabelText(/Goal weight/), '70');
    await user.click(screen.getByRole('button', { name: 'lbs' }));
    await user.selectOptions(screen.getByLabelText(/^Medication$/), 'Tirzepatide');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByLabelText(/Height \(feet\)/), '5');
    await user.type(screen.getByLabelText(/Height \(inches\)/), '8');
    await user.type(screen.getByLabelText('Treatment start date'), '2026-01-05');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /Start my journey/ }));
    const s = useStore.getState().settings;
    expect(s.startingWeight).toBeCloseTo(198.42, 0);
    expect(s.targetWeight).toBeCloseTo(154.32, 0);
  });
});
