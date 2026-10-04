import type { PersistStorage, StorageValue } from 'zustand/middleware';
import { CORRUPT_KEY } from './keys';
import { isObj } from '../lib/rowValidation';
import { sanitizePersistedState } from './sanitize';

/** What the last read of storage found; consumed by the store when it hydrates. */
export const storageReport = { skipped: 0 };

/** Hooks the store installs so the adapter can report write failures without importing the store. */
export const storageEvents: { onWriteError?: () => void; onWriteOk?: () => void } = {};

function copyToCorrupt(raw: string): void {
  try {
    localStorage.setItem(CORRUPT_KEY, raw);
  } catch {
    // Storage is full or blocked: nothing more we can do for the copy.
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
        copyToCorrupt(raw);
        return null;
      }
      if (!isObj(parsed) || !isObj(parsed.state)) {
        copyToCorrupt(raw);
        return null;
      }
      const clean = sanitizePersistedState(parsed.state);
      if (clean.dropped > 0 || clean.malformed) copyToCorrupt(raw);
      storageReport.skipped = clean.dropped;
      return { ...parsed, state: clean.state } as unknown as StorageValue<S>;
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
