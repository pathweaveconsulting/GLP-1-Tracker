import type { PersistedData } from '../types';
import { migrateDataModelV2, validateDataModelV2, type DataModelV2, type Provenance } from '../lib/dataModelV2';
import { isObj } from '../lib/rowValidation';
import { STORE_VERSION } from './migrate';

/**
 * The live schema bridge. The main record slot is stored in one of two formats:
 *
 * - version 1: `{ state: { settings, doses, weights, effects, hasOnboarded }, version: 1 }` (the original store);
 * - version 2: `{ version: 2, state: { hasOnboarded, model } }` where `model` is a validated DataModelV2.
 *
 * The app's in-memory store keeps the version-1 shape either way; this module converts at the storage boundary.
 * Data is written back in the format it was read in, so an upgraded vault never silently drops back to version 1
 * (which would lose provenance). Moving from 1 to 2 happens only through the explicit, recoverable upgrade in
 * vaultRecovery. Daily protein/water totals stay canonical in their own encrypted slot, so the live model's checkIns
 * domain is empty and marked absent: there is never a second copy that could diverge.
 */
export const LIVE_SCHEMA_VERSION = 2;
export type MainFormat = 1 | 2;
type Domain = 'doses' | 'weights' | 'legacyEffects';
type Tracked = Map<string, { provenance: Provenance; json: string }>;

let liveFormat: MainFormat = 1;
let tracked: Record<Domain, Tracked> = { doses: new Map(), weights: new Map(), legacyEffects: new Map() };
let hint: { source: 'csv_import' | 'backup_restore'; importBatchId: string | null } | null = null;

/** Format of the main slot as last read; writes use the same format. */
export const currentMainFormat = (): MainFormat => liveFormat;

/** The next records added without a known provenance came from this source (consumed by the next write). */
export function provenanceHint(source: 'csv_import' | 'backup_restore', importBatchId: string | null = null): void {
  hint = { source, importBatchId };
}

/** Test and lock helper: forget the format and provenance learned from the last read. */
export function resetMainSlotState(): void {
  liveFormat = 1;
  tracked = { doses: new Map(), weights: new Map(), legacyEffects: new Map() };
  hint = null;
}

const isV2Envelope = (v: unknown): v is { version: 2; state: { hasOnboarded: boolean; model: unknown } } =>
  isObj(v) && v.version === LIVE_SCHEMA_VERSION && Object.keys(v).every(k => k === 'version' || k === 'state')
  && isObj(v.state) && Object.keys(v.state).every(k => k === 'hasOnboarded' || k === 'model') && typeof v.state.hasOnboarded === 'boolean';

/** True for a stored main-slot document in the live version-2 format (shape only; decode validates fully). */
export const looksLikeV2 = (parsed: unknown): boolean => isV2Envelope(parsed);

/**
 * Decode a version-2 main slot into the store's state. Throws (never normalizes) on anything not exactly valid, so the
 * caller can preserve the original bytes and pause writes.
 */
export function decodeV2(parsed: unknown): { state: PersistedData; model: DataModelV2 } {
  if (!isV2Envelope(parsed)) throw Error('Unsupported record format. Update the app before opening these records.');
  const model = validateDataModelV2(parsed.state.model);
  if (model.metadata.dailyLogsPresent || model.checkIns.length) throw Error('Unexpected check-ins in the main record slot.');
  return { model, state: { settings: model.profile, doses: model.doses, weights: model.weights, effects: model.legacyEffects, hasOnboarded: parsed.state.hasOnboarded } };
}

/** Remember the format and per-record provenance of what was just read, so writes keep them. */
export function learnFromRead(format: MainFormat, model?: DataModelV2): void {
  liveFormat = format;
  tracked = { doses: new Map(), weights: new Map(), legacyEffects: new Map() };
  hint = null;
  if (!model) return;
  for (const domain of ['doses', 'weights', 'legacyEffects'] as const) {
    model[domain].forEach((row, i) => tracked[domain].set(row.id, { provenance: model.metadata.provenance[domain][i], json: JSON.stringify(row) }));
  }
}

type Origin = { source: Provenance['source']; importBatchId: string | null };

/**
 * Pure builder for a version-2 envelope. Records already in `known` keep their provenance (a changed one gets
 * `updatedAt`); any other record gets `origin` with `createdAt` (none for legacy, whose creation time is unknown).
 */
function buildV2(state: PersistedData, known: Record<Domain, Tracked>, origin: Origin, now: Date): { raw: string; next: Record<Domain, Tracked>; model: DataModelV2 } {
  const { hasOnboarded, settings, doses, weights, effects } = state;
  const model = migrateDataModelV2({ settings, doses, weights, effects });
  const stamp = now.toISOString();
  const next: Record<Domain, Tracked> = { doses: new Map(), weights: new Map(), legacyEffects: new Map() };
  for (const domain of ['doses', 'weights', 'legacyEffects'] as const) {
    model.metadata.provenance[domain] = model[domain].map(row => {
      const json = JSON.stringify(row);
      const seen = known[domain].get(row.id);
      const provenance: Provenance = !seen
        ? { id: row.id, createdAt: origin.source === 'legacy' ? null : stamp, updatedAt: null, source: origin.source, importBatchId: origin.source === 'csv_import' ? origin.importBatchId : null, externalIntegrationSource: null }
        : seen.json === json ? seen.provenance : { ...seen.provenance, updatedAt: stamp };
      next[domain].set(row.id, { provenance, json });
      return provenance;
    });
  }
  validateDataModelV2(model);
  return { raw: JSON.stringify({ version: LIVE_SCHEMA_VERSION, state: { hasOnboarded, model } }), next, model };
}
const empty = (): Record<Domain, Tracked> => ({ doses: new Map(), weights: new Map(), legacyEffects: new Map() });

/** Ordinary save in version 2: keeps known provenance, marks edits, and records new rows as manual (or the hint). */
export function encodeV2(state: PersistedData, now: Date = new Date()): string {
  const built = buildV2(state, tracked, hint ?? { source: 'manual', importBatchId: null }, now);
  tracked = built.next;
  hint = null;
  return built.raw;
}

/** The one-time upgrade: every existing record is marked `legacy` (its origin and creation time are unknown). */
export function upgradeToV2(state: PersistedData): { raw: string; model: DataModelV2 } {
  const { raw, model } = buildV2(state, empty(), { source: 'legacy', importBatchId: null }, new Date());
  return { raw, model };
}

/** A backup restored into an upgraded vault: every record is marked as coming from that restore. */
export function restoredV2(state: PersistedData, now: Date = new Date()): string {
  return buildV2(state, empty(), { source: 'backup_restore', importBatchId: null }, now).raw;
}

/** After a transaction replaced the main slot, adopt its format before any ordinary save can run. */
export function learnFromMainSlot(raw: string | undefined): void {
  if (raw === undefined) { learnFromRead(1); return; }
  const parsed: unknown = JSON.parse(raw);
  if (looksLikeV2(parsed)) learnFromRead(2, decodeV2(parsed).model);
  else learnFromRead(1);
}

/** Encode the store's state for the main slot in the current live format. */
export function encodeMain(state: PersistedData): string {
  if (liveFormat === 2) return encodeV2(state);
  hint = null; // original-format records carry no provenance
  return JSON.stringify({ state, version: STORE_VERSION });
}
