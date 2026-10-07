import { useMemo, useSyncExternalStore } from 'react';
import { DAILY_LOGS_KEY } from './keys';
import { isVaultUnlocked, readVaultSlot, writeVaultSlot, subscribeVaultSlots } from '../lib/vault';
import { DailyLog, parseDailyLogs, serializeDailyLogs } from '../lib/dailyLogs';
import { storageEvents } from './storage';
const snapshot = () => isVaultUnlocked() ? readVaultSlot(DAILY_LOGS_KEY) : null;
export function readDailyLogs(): DailyLog[] { return parseDailyLogs(snapshot()); }
export function useDailyLogs() {
  const raw = useSyncExternalStore(subscribeVaultSlots,snapshot,() => null);
  return useMemo(() => { try { return {rows:parseDailyLogs(raw),error:null}; } catch(error) { return {rows:[] as DailyLog[],error:error instanceof Error ? error.message : 'Daily records could not be read.'}; } },[raw]);
}
export async function replaceDailyLogs(rows: DailyLog[]): Promise<void> {
  if (!isVaultUnlocked()) throw new Error('Unlock your vault before recording daily totals.');
  const raw = rows.length ? serializeDailyLogs(rows) : null;
  try { await writeVaultSlot(DAILY_LOGS_KEY,raw); } catch(error) { storageEvents.onWriteError?.(); throw error; }
}
export async function saveDailyLog(row: DailyLog): Promise<void> {
  // Strict reading refuses to overwrite unreadable rows. Existing dates are daily totals, never added twice.
  const rows = readDailyLogs().filter(e => e.date !== row.date);
  await replaceDailyLogs([...rows,row].sort((a,b) => a.date.localeCompare(b.date)));
}
