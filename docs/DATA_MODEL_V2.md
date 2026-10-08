# Versioned data foundation

This draft implements a migration engine and backup adapter, not an automatic live-store cutover. The current Zustand store stays version 1 and daily totals keep their existing encrypted slot. No second canonical copy is written, so new edits cannot diverge between two stores.

## Contract

`src/lib/dataModelV2.ts` provides schema version 2 with profile, doses, weights, legacyEffects, checkIns, medicationSchedules, supplies, reminders, milestones, preferences, notes and metadata. Existing daily protein/water totals populate checkIns without becoming symptom/mood ratings. Existing symptom entries remain in legacyEffects with exact IDs, timestamps, custom ratings and notes.

Created/updated timestamps and integration/import identifiers are unknown for old entries and stay null. Source `legacy` identifies the migration origin, not an assertion that old records were manually entered. Daily provenance IDs are deterministic `daily:YYYY-MM-DD`; existing record IDs stay unchanged. Records with unknown fields, duplicate IDs, unsupported values or lossy normalization fail validation instead of being partially imported.

Schedule, supply, reminder, milestone, preference and standalone-note domains are reserved and must remain empty in this initial contract. Nonempty domains and new provenance formats are rejected until their own validators, storage adapters and backup fidelity tests are implemented. This is explicitly not completion of all Pack 1 domain features.

`prepareDataModelMigration` validates before conversion, builds a candidate in memory, serializes it, validates the result and returns the original bytes on success and failure. It performs no storage writes or clock reads. The migration preview now has an explicit encrypted recovery-point action, described below. The engine itself still performs no storage writes. A future live cutover must use a pre-operation recovery snapshot and preserve newer-tab checks.

## Backups

`createDataModelBackup` explicitly produces backup envelope version 3 with schemaVersion 2, caller-supplied appVersion and export date. `parseBackup` accepts this contract and reversibly adapts implemented domains to the current store, after rejecting unsupported metadata/domains. Existing normal downloads continue generating backup versions 1 or 2; old readers reject version 3. No additional plaintext download control was introduced. The version-3 exporter is not connected to the UI yet. Legacy version-1/2 parsers retain their established normalization behavior; the new strict guarantees apply to model-version-2 conversion and backup-version-3 restoration.

## Protection already used by the current app

The storage adapter now checks the outer store version before sanitizing. Future, negative, fractional, nonnumeric and null versions pause ordinary writes/removal and preserve exact original bytes, both plaintext and encrypted. Missing version remains the original unversioned format. The existing read-failure notice handles this state. JSON export in this state downloads the original main blob (encrypted when a vault exists), including all existing vault slots; it does not turn an empty in-memory snapshot into a supposed backup. CSV export and unsupported-version encrypted restore are rejected. An explicit existing start-fresh action can resume writes; that action remains destructive.

## Release gate and next work

The explicit encrypted recovery-point adapter and preview are implemented as a draft. The atomic backup-import adapter now creates automatic pre-import snapshots; the live schema bridge is still required before enabling live schema cutover. Add each domain with its own schema and tests, then expand all-domain backup previews. Credential-gated browser behavior, old-tab/new-app interactions and recovery on real devices need owner testing. No production merge, DNS change, paid service, new medical value or clinical recommendation is included.

## Encrypted recovery preview draft

`VITE_ENABLE_MIGRATION_PREVIEW=true` enables a Settings preview and confirmed recovery-point save. Validation reads the actual encrypted main/daily slots, rejects unsupported versions/fields, and shows counts without switching the live store or storing a second canonical model. It does not complete migration to live schema V2. No medical values change.

A recovery point retains exact prior main, daily, rescue and reminder slot strings inside the existing AES-GCM envelope. Only one generation is retained; saving another replaces it, and the confirmation explains this. It is not a separate localStorage plaintext key. The transaction waits for ordinary queued writes, checks saved ciphertext before and after encryption under the existing browser lock, decrypts the candidate to verify its payload, saves one atomic envelope and checks its readback before publishing slots. A quota failure leaves the old envelope and slot view intact. An earlier failed ordinary save still blocks recovery instead of being silently bypassed. Ordinary edits during a transaction are rejected with the existing save-error path; the recovery UI blocks interaction while saving.

Confirmed restore swaps all prior slots together, then hydrates the current store. Current saved records become the new recovery point so the rollback itself can be reversed. Unsupported current or recovery formats are rejected rather than normalized. Whole-data erasure removes the generation as well. Existing points remain visible/restorable when the preview flag is turned off.

Encrypted exports contain the recovery slot, but the existing backup importer restores only the backup's current records, not its recovery history; the UI states this. The atomic backup-import draft now saves a pre-import recovery point automatically alongside imported main/daily records. A browser-data clear deletes local recovery; separate downloaded backups remain necessary. Builds predating the recovery slot reject these newer vault files rather than dropping an unknown slot. Old-tab/new-build interactions and handoff to older versions need explicit owner testing. Browser credential creation/unlock is not performed by the agent. This does not protect an unlocked browser against an administrator delivering malicious JavaScript.

## Atomic backup import draft

The Settings confirmation captures the current encrypted slot view. Restore validates the parsed incoming data and current version-1 store, refuses stale previews and unsupported current fields, and commits imported main/daily records plus exact pre-import recovery in one envelope. The old recovery point is replaced, with confirmation explaining this. Existing rescue/reminder slots stay current and their prior bytes also appear in recovery. No source-file recovery history is imported. Old backups without a daily domain remove that slot in the same transaction; its prior bytes remain recoverable. The store view hydrates only after commit, so quota failure leaves both the visible records and saved ciphertext unchanged. A busy modal and synchronous in-progress guard prevent repeated confirmation. A failure after a successful commit is reported as a refresh problem, not as an unchanged-data claim. Live schema V2 remains off. The legacy plaintext branch retains its existing restore behavior; the encrypted production candidate always runs behind VaultGate.

## Live schema bridge draft

The app can now store its main records in the schema-2 format and keep using them, behind an explicit, recoverable upgrade.

**Storage format** (`src/store/mainSlot.ts`):
- The main encrypted slot is either the original `{ state, version: 1 }` or `{ version: 2, state: { hasOnboarded, model } }`, where `model` is a validated DataModelV2.
- The in-memory store keeps its version-1 shape; conversion happens only at the storage boundary.
- Reading schema 2 is always on. Upgraded data is validated exactly, never sanitized. Anything unexpected keeps the original bytes and pauses writes, the same protection used for unsupported versions:
  - unknown fields;
  - provenance that does not match its records;
  - an integration source;
  - a nonempty reserved domain.

**One canonical copy:**
- Data is always written back in the format it was read in, so an upgraded vault never silently drops back to version 1 and loses provenance.
- Daily protein/water totals stay canonical in their own encrypted slot. The live model's checkIns domain is empty and marked absent, so there is never a second copy that could diverge.

**The upgrade** (`upgradeVaultToSchemaV2`):
- It is offered in Settings only when `VITE_ENABLE_LIVE_SCHEMA_V2=true`, and only after a confirmation. The confirmation says that older app versions cannot open upgraded records, and that the current records become the recovery point, replacing any previous one.
- The upgraded main slot and an exact recovery point of every original slot commit in one encrypted envelope, or nothing changes. This is covered by tests for:
  - storage-full failure;
  - a stale preview;
  - a second upgrade.
- Existing records are marked `legacy`, with no invented creation time.
- Restoring the recovery point returns the original bytes and the original format. The format is re-learned immediately, so even a save before the view reloads uses the original format.

**Provenance after the upgrade:**

| Record | Source | Timestamps |
|---|---|---|
| New record | `manual` | `createdAt` set |
| Edited record | unchanged | `updatedAt` set; `createdAt` unchanged (stays empty for legacy records) |
| CSV import | `csv_import` | one shared `importBatchId` per import |
| Backup restored into an upgraded vault | `backup_restore` | `createdAt` set; the vault stays upgraded |

**Compatibility:**
- Encrypted downloads of upgraded records restore in this build.
- Regular JSON backups are unchanged (versions 1 and 2), so they stay readable by older builds; they do not yet carry provenance.
- Builds older than this one see version 2 as unsupported and leave the bytes untouched.

**Release gate:** the flag stays off in production until the owner approves a concrete release. Real-device upgrade and rollback, old-tab/new-build interaction, and screen-reader checks are not verified. No medical value changes.
