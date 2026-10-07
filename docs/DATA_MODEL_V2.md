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
