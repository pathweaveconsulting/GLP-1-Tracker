import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { seedStore } from './fixtures';
import { open } from './helpers';

afterEach(cleanup);
const file = (name: string, body: string) => new File([body], name, { type: 'text/csv' });

async function preview(csv: string, unit: 'lbs' | 'kg') {
  seedStore('empty', unit);
  const user = userEvent.setup();
  await open('/weight');
  await user.upload(screen.getByLabelText(/choose a csv file of weights/i), file('w.csv', csv));
  return screen.findByRole('alertdialog');
}

describe('RV05: the import summary says which unit it used and why', () => {
  it('a header with no unit shows the assumption', async () => {
    const dialog = await preview('Date,Weight\n2026-03-01,200', 'lbs');
    expect(dialog).toHaveTextContent('No unit in the file; assuming lbs');
  });
  it('the assumption names the fallback unit (kg)', async () => {
    const dialog = await preview('Date,Weight\n2026-03-01,80', 'kg');
    expect(dialog).toHaveTextContent('No unit in the file; assuming kg');
  });
  it('a joined metric header is read as kg and does not show the assumption', async () => {
    const dialog = await preview('Date,WeightKg\n2026-03-01,90', 'lbs');
    expect(within(dialog).getByText('kg', { selector: 'strong' })).toBeInTheDocument();
    expect(dialog).toHaveTextContent(/from the column header/);
    expect(dialog).not.toHaveTextContent(/No unit in the file/);
  });
});
