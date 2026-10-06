import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { seedStore } from './fixtures';
import { open } from './helpers';
import { useStore } from '../store/useStore';
import { BACKUP_FORMAT, createBackup } from '../lib/backup';

let blobs: Blob[] = [];
let downloads: string[] = [];

beforeEach(() => {
  blobs = [];
  downloads = [];
  URL.createObjectURL = vi.fn((b: Blob | MediaSource) => { blobs.push(b as Blob); return 'blob:test'; });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { downloads.push(this.download); });
});

const textOf = (b: Blob) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsText(b); });
const bytesOf = (b: Blob) => new Promise<number[]>((res) => { const r = new FileReader(); r.onload = () => res(Array.from(new Uint8Array(r.result as ArrayBuffer))); r.readAsArrayBuffer(b); });
const file = (name: string, content: string, type = 'text/plain') => new File([content], name, { type });

describe('Settings: truthful privacy copy', () => {
  it('says the data is unencrypted in this browser and can be lost', async () => {
    seedStore('empty', 'lbs');
    await open('/settings');
    const text = document.querySelector('main')!.textContent!;
    expect(text).toMatch(/unencrypted/i);
    expect(text).toMatch(/clear your browser data/i);
    expect(text).not.toMatch(/encrypted in your browser/i);
  });
});

describe('exports', () => {
  it('Settings CSV export downloads a Blob (not a data: URI) with BOM and the tidy header', async () => {
    seedStore('populated', 'kg');
    const user = userEvent.setup();
    await open('/settings');
    await user.click(screen.getByRole('button', { name: /export everything as csv/i }));
    expect(downloads[0]).toMatch(/^glp1-tracker-data-\d{4}-\d{2}-\d{2}\.csv$/);
    const csv = await textOf(blobs[0]);
    expect((await bytesOf(blobs[0])).slice(0, 3)).toEqual([0xef, 0xbb, 0xbf]); // UTF-8 BOM
    expect(blobs[0].type).toMatch(/^text\/csv/);
    expect(csv.split('\r\n')[0].replace(/^\uFEFF/, '')).toBe('Type,Date,Item,Value,Unit,Details,Notes');
    expect(csv).toMatch(/Weight,\d{4}-\d{2}-\d{2},Weight,\d+(\.\d)?,kg,/);
    expect(screen.getByRole('status')).toHaveTextContent(/csv export downloaded/i);
  });

  it('AllLogs uses the same export', async () => {
    seedStore('populated', 'lbs');
    const user = userEvent.setup();
    await open('/logs');
    await user.click(screen.getByRole('button', { name: /csv export/i }));
    const csv = await textOf(blobs[0]);
    expect(csv).toContain('Type,Date,Item,Value,Unit,Details,Notes');
    expect(csv).toMatch(/Weight,\d{4}-\d{2}-\d{2},Weight,\d+\.\d,lbs/);
  });

  it('JSON backup contains the format tag and all rows', async () => {
    seedStore('populated', 'lbs');
    const user = userEvent.setup();
    await open('/settings');
    await user.click(screen.getByRole('button', { name: /download a backup/i }));
    const json = JSON.parse(await textOf(blobs[0]));
    expect(json.format).toBe(BACKUP_FORMAT);
    expect(json.version).toBe(1);
    expect(json.data.weights.length).toBe(useStore.getState().weights.length);
  });
});

describe('restore from backup', () => {
  it('rejects a bad file with readable errors and changes nothing', async () => {
    seedStore('populated', 'lbs');
    const before = useStore.getState().weights.length;
    const user = userEvent.setup();
    await open('/settings');
    await user.upload(screen.getByLabelText(/choose a backup file/i), file('b.json', JSON.stringify({ format: BACKUP_FORMAT, version: 99, data: {} })));
    const dialog = await screen.findByRole('dialog', { name: /can.t be restored/i });
    expect(dialog).toHaveTextContent(/newer version/);
    expect(useStore.getState().weights.length).toBe(before);
  });

  it('asks before replacing, and Cancel keeps current data', async () => {
    seedStore('populated', 'lbs');
    const backup = createBackup({
      settings: { ...useStore.getState().settings, weightUnit: 'kg' },
      doses: [], weights: [{ id: 'only', date: new Date().toISOString(), weightLbs: 150 }], effects: [],
    });
    const before = useStore.getState().weights.length;
    const user = userEvent.setup();
    await open('/settings');
    await user.upload(screen.getByLabelText(/choose a backup file/i), file('b.json', JSON.stringify(backup), 'application/json'));
    const confirm = await screen.findByRole('alertdialog');
    expect(confirm).toHaveTextContent(/0 doses, 1 weight and 0 symptom logs/);
    await user.click(within(confirm).getByRole('button', { name: /cancel/i }));
    expect(useStore.getState().weights.length).toBe(before);

    await user.upload(screen.getByLabelText(/choose a backup file/i), file('b.json', JSON.stringify(backup), 'application/json'));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /replace my data/i }));
    await waitFor(() => expect(useStore.getState().weights).toHaveLength(1));
    expect(useStore.getState().doses).toEqual([]);
    expect(useStore.getState().settings.weightUnit).toBe('kg');
  });
});

describe('weight CSV import', () => {
  it('previews, imports readable rows in the detected unit, and skips duplicates', async () => {
    seedStore('empty', 'lbs');
    useStore.setState({ weights: [{ id: 'x', date: new Date(2026, 2, 1, 12).toISOString(), weightLbs: 200 }] });
    const user = userEvent.setup();
    await open('/weight');
    const csv = 'Date,Weight (kg)\n05/03/2026,90\n2026-03-12,89.5\nbad,88\n2026-03-01,90.7188';
    await user.upload(screen.getByLabelText(/choose a csv file of weights/i), file('w.csv', csv, 'text/csv'));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent(/import 2 weights\?/i);
    expect(dialog).toHaveTextContent(/kg/);
    expect(dialog).toHaveTextContent(/1 already in your log and 1 invalid or future-dated row/);
    await user.click(within(dialog).getByRole('button', { name: /^import$/i }));
    const w = useStore.getState().weights;
    expect(w).toHaveLength(3);
    expect(w.some((x) => Math.abs(x.weightLbs - 90 * 2.2046226) < 0.01)).toBe(true);
    expect(screen.getByRole('status')).toHaveTextContent(/imported 2 weights/i);
  });

  it('shows an alert (not window.alert) when the file has no usable columns', async () => {
    seedStore('empty', 'lbs');
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const user = userEvent.setup();
    await open('/weight');
    await user.upload(screen.getByLabelText(/choose a csv file of weights/i), file('w.csv', 'foo,bar\n1,2', 'text/csv'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t find the columns/i);
    expect(alertSpy).not.toHaveBeenCalled();
    expect(useStore.getState().weights).toHaveLength(0);
  });
});

describe('no native dialogs', () => {
  it('source has no confirm( or alert( calls', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
    const offenders = walk('src').filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f)).filter((f) => /(^|[^.\w])(confirm|alert)\(/.test(fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')));
    expect(offenders).toEqual([]);
  });
});
