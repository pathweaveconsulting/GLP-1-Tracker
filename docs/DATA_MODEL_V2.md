# Versioned data foundation

This draft implements a migration engine and backup adapter, not an automatic live-store cutover. The current Zustand store stays version 1 and daily totals keep their existing encrypted slot. No second canonical copy is written, so new edits cannot diverge between two stores.

## Contract

`src/lib/dataModelV2.ts` provides schema version 2 with profile, doses, weights, legacyEffects, checkIns, medicationSchedules, supplies, reminders, milestones, preferences, notes and metadata. Existing daily protein/water totals populate checkIns without becoming symptom/mood ratings. Existing symptom entries remain in legacyEffects with exact IDs, timestamps, custom ratings and notes.

Created/updated timestamps and integration/import identifiers are unknown for old entries and stay null. Source `legacy` identifies the migration origin, not an assertion that old records were manually entered. Daily provenance IDs are deterministic `daily:YYYY-MM-DD`; existing record IDs stay unchanged. Records with unknown fields, duplicate IDs, unsupported values or lossy normalization fail validation instead of being partially imported.

Schedule, supply, reminder, milestone, preference and standalone-note domains are reserved and must remain empty in this initial contract. Nonempty domains and new provenance formats are rejected until their own validators, storage adapters and backup fidelity tests are implemented. This is explicitly not completion of all Pack 1 domain features.

`prepareDataModelMigration` validates before conversion, builds a candidate in memory, serializes it, validates the result and returns the original bytes on success and failure. It performs no storage writes or clock reads. A future cutover must save and verify an encrypted pre-operation recovery snapshot before writing a candidate, preserve newer-tab checks, and prove rollback on write failure. Returning original bytes in this engine is not a claim that durable rollback is already implemented.

## Backups

`createDataModelBackup` explicitly produces backup envelope version 3 with schemaVersion 2, caller-supplied appVersion and export date. `parseBackup` accepts this contract and reversibly adapts implemented domains to the current store, after rejecting unsupported metadata/domains. Existing normal downloads continue generating backup versions 1 or 2; old readers reject version 3. No additional plaintext download control was introduced. The version-3 exporter is not connected to the UI yet. Legacy version-1/2 parsers retain their established normalization behavior; the new strict guarantees apply to model-version-2 conversion and backup-version-3 restoration.

## Protection already used by the current app

The storage adapter now checks the outer store version before sanitizing. Future, negative, fractional, nonnumeric and null versions pause ordinary writes/removal and preserve exact original bytes, both plaintext and encrypted. Missing version remains the original unversioned format. The existing read-failure notice handles this state. JSON export in this state downloads the original main blob (encrypted when a vault exists), including all existing vault slots; it does not turn an empty in-memory snapshot into a supposed backup. CSV export and unsupported-version encrypted restore are rejected. An explicit existing start-fresh action can resume writes; that action remains destructive.

## Release gate and next work

Complete the encrypted durable recovery/rollback adapter and user-confirmed migration preview before enabling live schema cutover. Add each domain with its own schema and tests, then expand all-domain backup previews. Credential-gated browser behavior, old-tab/new-app interactions and recovery on real devices need owner testing. No production merge, DNS change, paid service, new medical value or clinical recommendation is included.
