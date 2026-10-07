import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Onboarding } from '../pages/Onboarding';
import { useStore } from '../store/useStore';
import { validateProfile } from '../lib/profile';
import { EditProfileModal } from '../components/modals/EditProfileModal';
import { seedStore } from './fixtures';

async function firstStep() {
  useStore.getState().resetAllData();
  render(<Onboarding />);
  const user = userEvent.setup();
  await user.selectOptions(screen.getByLabelText('Medication'), 'Other');
  await user.click(screen.getByRole('button', { name: 'kg' }));
  await user.type(screen.getByLabelText(/Starting weight/), '90');
  await user.type(screen.getByLabelText(/Goal weight/), '70');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  return user;
}

describe('reviewed onboarding', () => {
  it('requires explicit medication and date, presents centimetres, preserves data on Back, and gates completion on safety consent', async () => {
    useStore.getState().resetAllData();
    render(<Onboarding />);
    expect(screen.getByLabelText('Medication')).toHaveValue('');
    expect(screen.queryByRole('checkbox')).toBeNull();
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Medication'), 'Other');
    await user.click(screen.getByRole('button', { name: 'kg' }));
    await user.type(screen.getByLabelText(/Starting weight/), '90');
    await user.type(screen.getByLabelText(/Goal weight/), '70');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByLabelText('Treatment start date')).toHaveValue('');
    expect(screen.getByRole('heading', { name: /Step 2/ })).toHaveFocus();
    await user.type(screen.getByLabelText('Height (cm)'), '172.72');
    await user.type(screen.getByLabelText('Treatment start date'), '2026-01-05');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByTestId('safety-full')).toBeInTheDocument();
    expect(screen.getByText('172.72 cm')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start my journey' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Please confirm/);
    expect(useStore.getState().hasOnboarded).toBe(false);
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByLabelText('Height (cm)')).toHaveValue(172.72);
    await user.clear(screen.getByLabelText('Height (cm)'));
    await user.type(screen.getByLabelText('Height (cm)'), '170');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Start my journey' }));
    expect(useStore.getState().hasOnboarded).toBe(true);
    expect(useStore.getState().settings.heightInches).toBeCloseTo(170 / 2.54, 8);
    expect(useStore.getState().weights).toHaveLength(1);
  });

  it('converts centimetres and feet/inches when navigating back to change units', async () => {
    const user = await firstStep();
    await user.type(screen.getByLabelText('Height (cm)'), '172.72');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await user.click(screen.getByRole('button', { name: 'lbs' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByLabelText('Height (feet)')).toHaveValue(5);
    expect(screen.getByLabelText('Height (inches)')).toHaveValue(8);
  });

  it('validates metric height and goals without recommending a medical target', () => {
    const base = { medication: 'Other' as const, unit: 'kg' as const, startingWeight: '90', goalWeight: '70', heightFt: '', heightIn: '', heightCm: '172.72', startDate: '2026-01-05' };
    expect(validateProfile(base).value?.heightInches).toBe(68);
    expect(validateProfile({ ...base, heightCm: '' }).errors.heightCm).toBeTruthy();
    expect(validateProfile({ ...base, heightCm: 'Infinity' }).errors.heightCm).toBeTruthy();
    expect(validateProfile({ ...base, goalWeight: '90' }).errors.goalWeight).toMatch(/clinician/);
    expect(validateProfile({ ...base, medication: '' }).errors.medication).toBeTruthy();
  });

  it('metric profile editing preserves exact stored height unless edited', async () => {
    seedStore('populated', 'kg');
    const original = 68.1234567;
    useStore.setState({ settings: { ...useStore.getState().settings, heightInches: original } });
    const { unmount } = render(<EditProfileModal isOpen onClose={() => {}} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Save Profile' }));
    expect(useStore.getState().settings.heightInches).toBe(original);
    unmount();
    render(<EditProfileModal isOpen onClose={() => {}} />);
    await user.clear(screen.getByLabelText('Height (cm)'));
    await user.type(screen.getByLabelText('Height (cm)'), '180');
    await user.click(screen.getByRole('button', { name: 'Save Profile' }));
    expect(useStore.getState().settings.heightInches).toBeCloseTo(180 / 2.54, 8);
  });
});
