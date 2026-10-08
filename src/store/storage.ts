import type { PersistStorage, StorageValue } from 'zustand/middleware';
import { CORRUPT_KEY, STORAGE_KEY } from './keys';
import { decodeV2, encodeMain, learnFromRead, LIVE_SCHEMA_VERSION } from './mainSlot';
import type { PersistedData } from '../types';
import { STORE_VERSION, supportedStoreVersion } from './migrate';
import { isObj } from '../lib/rowValidation';
import { sanitizePersistedState } from './sanitize';
import { hasVault, isVaultUnlocked, readVaultSlot, writeVaultSlot } from '../lib/vault';

async function readEncrypted<S>(name: string): Promise<StorageValue<S> | null> {
  storageReport.unsupportedVersion = false;
  storageReport.skipped = 0;
  storageReport.rescueKept = true;
  storageReport.unreadable = false;
  storageReport.malformed = false;
  storageReport.readFailed = false;
  writesPaused = false;
  try {
    const raw = readVaultSlot(name);
    if (raw === null) return null;
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { parsed = null; }
    if (name === STORAGE_KEY && isObj(parsed) && parsed.version === LIVE_SCHEMA_VERSION) {
      // Upgraded (schema 2) records are validated exactly, never sanitized: anything unexpected keeps the original
      // bytes and pauses writes, the same protection as an unsupported version.
      try {
        const { state, model } = decodeV2(parsed);
        learnFromRead(2, model);
        return { state, version: STORE_VERSION } as unknown as StorageValue<S>;
      } catch {
        writesPaused = true; storageReport.readFailed = true; storageReport.unsupportedVersion = true; return null;
      }
    }
    if (isObj(parsed) && !supportedStoreVersion(parsed.version)) { writesPaused = true; storageReport.readFailed = true; storageReport.unsupportedVersion = true; return null; }
    if (name === STORAGE_KEY) learnFromRead(1);
    if (!isObj(parsed) || !isObj(parsed.state)) {
      storageReport.unreadable = true;
      try { await writeVaultSlot(CORRUPT_KEY, raw); } catch { storageReport.rescueKept = false; }
      return null;
    }
    const clean = sanitizePersistedState(parsed.state);
    storageReport.malformed = clean.malformed;
    storageReport.skipped = clean.dropped;
    const result = { ...parsed, state: clean.state };
    if (clean.dropped > 0 || clean.malformed) {
      try {
        await writeVaultSlot(CORRUPT_KEY, raw);
        await writeVaultSlot(name, JSON.stringify(result));
      } catch { storageReport.rescueKept = false; }
    }
    return result as unknown as StorageValue<S>;
  } catch {
    writesPaused = true;
    storageReport.readFailed = true;
    return null;
  }
}

/** What the last read of storage found; consumed by the store when it hydrates. */
export const storageReport = { skipped: 0, rescueKept: true, unreadable: false, malformed: false, readFailed: false, unsupportedVersion: false };

/**
 * True after a read of the main key THREW (storage unreadable, as opposed to empty). While true nothing is written
 * or removed, so a transient read failure can never lead to the unread data being overwritten. Cleared only by an
 * explicit user action via resumeWrites().
 */
let writesPaused = false;
export function resumeWrites(): void {
  writesPaused = false;
  storageReport.readFailed = false;
  storageReport.unsupportedVersion = false;
}

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
      try { if (hasVault()) return readEncrypted<S>(name); } catch {
        writesPaused = true;
        storageReport.readFailed = true;
        return null;
      }
      storageReport.unsupportedVersion = false;
      storageReport.skipped = 0;
      storageReport.rescueKept = true;
      storageReport.unreadable = false;
      storageReport.malformed = false;
      writesPaused = false;
      storageReport.readFailed = false;
      let raw: string | null = null;
      try {
        raw = localStorage.getItem(name);
      } catch {
        writesPaused = true;
        storageReport.readFailed = true;
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
      if (isObj(parsed) && !supportedStoreVersion(parsed.version)) { writesPaused = true; storageReport.readFailed = true; storageReport.unsupportedVersion = true; return null; }
      if (!isObj(parsed) || !isObj(parsed.state)) {
        storageReport.unreadable = true;
        storageReport.rescueKept = copyToCorrupt(raw);
        return null;
      }
      const clean = sanitizePersistedState(parsed.state);
      storageReport.malformed = clean.malformed;
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
      if (writesPaused) return; // see writesPaused: never overwrite data we could not read
      try {
        if (hasVault()) {
          if (!isVaultUnlocked()) return; // Clearing decrypted memory on lock never writes records.
          // The main slot is written in the format it was read in (see mainSlot.ts).
          const raw = name === STORAGE_KEY ? encodeMain((value as unknown as { state: PersistedData }).state) : JSON.stringify(value);
          return writeVaultSlot(name, raw).then(() => storageEvents.onWriteOk?.(), () => storageEvents.onWriteError?.());
        }
        localStorage.setItem(name, JSON.stringify(value));
        storageEvents.onWriteOk?.();
      } catch {
        storageEvents.onWriteError?.();
      }
    },
    removeItem: (name) => {
      if (writesPaused) return;
      try {
        if (hasVault()) return writeVaultSlot(name, null).catch(() => storageEvents.onWriteError?.());
        localStorage.removeItem(name);
      } catch {
        // ignore: nothing to remove or storage is blocked
      }
    },
  };
}
