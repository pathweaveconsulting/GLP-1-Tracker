import { downloadTextFile } from './csv';
import { buildTidyCsv } from './tidyExport';
import { BackupData, createBackup } from './backup';
import { toLocalDateString } from './dates';
import type { WeightUnit } from './units';
import { encryptedBackup, hasVault } from './vault';
import { STORE_VERSION } from '../store/migrate';
import { readDailyLogs } from '../store/dailyLogs';

/** Download the tidy CSV (Type, Date, Item, Value, Unit, Details, Notes) in the user's unit. */
export function exportTidyCsv(data: BackupData, unit: WeightUnit, now: Date = new Date()): void {
  const csv = buildTidyCsv({ doses: data.doses, weights: data.weights, effects: data.effects, unit, dailyLogs:data.dailyLogs ?? readDailyLogs() });
  downloadTextFile(`glp1-tracker-data-${toLocalDateString(now)}.csv`, csv);
}

/** Download a JSON backup that can be restored later. */
export function exportBackupJson(data: BackupData, now: Date = new Date()): void | Promise<void> {
  if (hasVault()) return encryptedBackup(JSON.stringify({ state: { ...data, hasOnboarded: true }, version: STORE_VERSION })).then(raw => {
    downloadTextFile(`glp1-encrypted-backup-${toLocalDateString(now)}.json`, raw, 'application/json');
  });
  downloadTextFile(`glp1-tracker-backup-${toLocalDateString(now)}.json`, JSON.stringify(createBackup(data, now), null, 2), 'application/json');
}

export function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ''));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}
