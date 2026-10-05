import type { PersistStorage, StorageValue } from 'zustand/middleware';
import { CORRUPT_KEY } from './keys';
import { isObj } from '../lib/rowValidation';
import { sanitizePersistedState } from './sanitize';

/** What the last read of storage found; consumed by the store when it hydrates. */
export const storageReport = { skipped: 0, rescueKept: true, unreadable: false };

/** Hooks the store installs so the adapter can report write failures without importing the store. */
export const storageEvents: { onWriteError?: () => void; onWriteOk?: () => void } = {};

/** Stores the raw blob under CORRUPT_KEY; false when storage is full or blocked, so nothing may claim a copy exists. */
function copyToCorrupt(raw: string): boolean {
  try {
    localStorage.setItem(CORRUPT_KEY, raw);
    return true;
  } catch {
    return false;
  }
}

/**
 * Storage adapter for the persisted store. Reading never throws: unparseable or invalid data is
 * copied (raw, newest only) to CORRUPT_KEY before anything can overwrite it, bad rows are dropped
 * and counted, and the rest of the data is kept.
 */
export function createSafeStorage<S>(): PersistStorage<S> {
  return {
    getItem: (name) => {
      storageReport.skipped = 0;
      storageReport.rescueKept = true;
      storageReport.unreadable = false;
      let raw: string | null = null;
      try {
        raw = localStorage.getItem(name);
      } catch {
        return null;
      }
      if (raw == null) return null;

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        storageReport.unreadable = true;
        storageReport.rescueKept = copyToCorrupt(raw);
        return null;
      }
      if (!isObj(parsed) || !isObj(parsed.state)) {
        storageReport.unreadable = true;
        storageReport.rescueKept = copyToCorrupt(raw);
        return null;
      }
      const clean = sanitizePersistedState(parsed.state);
      const result = { ...parsed, state: clean.state };
      if (clean.dropped > 0 || clean.malformed) {
        storageReport.rescueKept = copyToCorrupt(raw);
        // Once the original is safe, store the cleaned blob so the notice doesn't repeat on every reload.
        // If the copy failed, leave the original in place: it is the only copy there is.
        if (storageReport.rescueKept) {
          try {
            localStorage.setItem(name, JSON.stringify(result));
          } catch {
            // ignore: the next write will try again
          }
        }
      }
      storageReport.skipped = clean.dropped;
      return result as unknown as StorageValue<S>;
    },
    // Writes can fail (quota exceeded, storage blocked). The app keeps working in memory and the store is told,
    // so it can warn the user and offer a backup. Nothing here may throw into a click handler.
    setItem: (name, value) => {
      try {
        localStorage.setItem(name, JSON.stringify(value));
        storageEvents.onWriteOk?.();
      } catch {
        storageEvents.onWriteError?.();
      }
    },
    removeItem: (name) => {
      try {
        localStorage.removeItem(name);
      } catch {
        // ignore: nothing to remove or storage is blocked
      }
    },
  };
}
