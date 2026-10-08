# Master backlog implementation — 2026-10-07

The owner's complete Packs 0–60 are preserved in MASTER_PRODUCT_BACKLOG.md. Execution order is incremental; this status is not a claim that a pack is complete. Existing records and features must survive each migration. Missing data never becomes zero, none or normal.

## Current draft work

Draft PRs #4–9 are stacked: backup recovery, encrypted vault, onboarding accessibility, offline installation, clinician records and daily protein/water totals. They are not production releases. PR #9 remote head 7a19809e6c41729427eb900c2543a1826dd81e7e was verified open, draft and unmerged when this foundation step started. Its existing CI/preview results are recorded in its description.

Symptom history foundation work (part of Pack 3) adds editing, confirmation before deletion, and undo of the most recent deletion while the page remains open. All collected and legacy recorded ratings, including explicit none, now appear in history. Edits preserve identity and the original timestamp when the date is unchanged. Clearing a rating means unrecorded. Undo preserves the original record and refuses to overwrite an existing ID. Existing assertions have not been changed. This does not complete Pack 3: dose/weight undo is added in the record-deletion draft below; duplicate warnings, provenance and durable history remain outstanding.

## Next sequence

1. Verify the symptom-history draft CI and preview; owner completes credential-gated device checks.
2. Design and test the additive versioned schema/migration (Pack 1), including rescue on failure and preservation of legacy symptom entries. Do not silently reinterpret old severity ratings as new mood/energy scales.
3. Extend backup/restore preview and rollback to every newly introduced domain (Pack 2), then complete remaining record CRUD/undo and duplicate warnings (Pack 3).
4. Implement navigation/Today and user-defined schedules (Packs 4–6), then dose and check-in improvements (Packs 7–8), each in its own tested draft.
5. Proceed through the remaining waves in the owner's backlog; QC Packs 57–60 apply throughout.

Clinical/evidence registry design belongs to Pack 0. Medical values and wording need qualified human review. Pack 40 remains a safety hold; peer comparisons, AI, cloud sync, native integrations and monetisation remain later work with their stated prerequisites. No dosing calculator or recommendation is authorized for immediate implementation by this backlog.

## Release limits

No production merge, production feature-flag change, DNS change, force-push or paid service. Device vault creation/unlock requires owner handoff. Real-browser symptom editing/deletion/undo, screen readers, mobile layout, rendered colours, offline install and print remain unverified. Encryption cannot protect an unlocked session against an administrator replacing the delivered JavaScript. No claim of immunity to hacking.

## Versioned foundation draft

Schema V2 conversion/validation and backup V3 adapters are implemented; live storage stays version 1. New domains are reserved and reject nonempty data until their validators exist. Current app protection blocks ordinary writes/removal, CSV and encrypted restoration for unsupported store versions and offers the original main data in JSON backup. See DATA_MODEL_V2.md. This is not an automatic migration. The subsequent encrypted recovery preview draft adds explicit durable recovery, and the following atomic-restore draft adds pre-import snapshots; the live schema bridge remains before cutover.

## Encrypted recovery preview draft

Adds a preview-only Settings migration validation and confirmed encrypted one-generation recovery save/restore, with exact prior slots, atomic ciphertext commit, stale-preview/tab protection, rollback undo and erasure of history. Production stays unchanged. This is part of Packs 1–3, not completion of all-domain migration: live schema V2, imported recovery-history restoration and the future domain schemas remain outstanding. Automatic pre-import recovery is added by the following draft. Next: test the live-schema bridge in a separate draft before owner preview acceptance.

## Atomic backup restoration draft

Automatic pre-import recovery and atomic main/daily replacement are now implemented for the encrypted path. Restore preserves old records as the single recovery point, checks the confirmation baseline, and changes the view only after verified saving. This is part of Pack 2. Live-schema bridge, future-domain validators, imported recovery-history restoration, record safeguards and the device/clinical release checks remain outstanding.

## Dose / weight deletion safeguards draft

Dose and weight history now require explicit confirmation before deletion. A record changed after opening confirmation is kept and must be reviewed again. Last-deletion undo retains exact ID/time/value/notes and original array position, including tie order for equal timestamps. Duplicate-ID restoration refuses to overwrite existing records. Undo is only available while the page stays mounted and only for the latest deletion; this is stated in the confirmation. Existing encrypted save failures still use the storage warning/recovery path. This is not durable per-record history, editing UI or completion of Pack 3.

## Dose / weight editing draft (Pack 3.1–3.2)

Injections and weigh-ins can be edited from Medication, Progress (weigh-in table) and All history. The edit dialogs are the logging dialogs in edit mode ("Edit injection", "Edit weight", "Save changes").
- **Exact values:** an edit starts from the stored record. Fields the user leaves untouched are written back exactly, so opening and saving never nudges a weight through kg/lb display rounding and never re-times a dose. Saving with no changes writes nothing.
- **Identity:** ID, list position, key order and any fields the form does not know about are kept.
- **Stale records:** a record changed or deleted after the dialog opened is not overwritten or recreated. The dialog says nothing was saved.
- **Dose amount checks:** changing the medication or amount re-runs the amount checks, including the double-check above the usual maximum. An unchanged saved amount is not re-checked. Changing the medication while editing keeps the recorded amount instead of substituting a default.
- **Undo:** the latest edit can be undone while the page stays open, through the same stale-safe path. Undo is refused if the record changed again.
- **Store:** `editDose` / `editWeight` do the compare-and-replace.

Tests: `src/test/recordEditing.test.tsx` (11), passing in UTC, New York, Los Angeles, Kolkata and Auckland. Mutation-checked: removing the stale check, always converting weight, or always re-timing doses each fails tests.

Still outstanding in Pack 3: duplicate warnings (3.4), provenance (3.5), durable per-record history. Real-browser editing in the vault-gated app is unverified.

## Duplicate warnings draft (Pack 3.4)

Logging or editing an injection or weigh-in now warns when it looks like a record already saved. It never blocks.

**What counts as a possible duplicate** (`src/lib/duplicates.ts`):
- **Injection:** same medication and exactly the same amount, within 12 hours.
- **Weigh-in:** same local day, within 0.5 lb (about 0.2 kg).

The record being edited is never compared with itself. The thresholds are narrow on purpose: they catch a double tap or a record logged twice, not every nearby entry. A once-daily medication logged a day apart does not trigger the warning.

**What the user sees:**
- The warning names the existing record, for example "You already recorded 5 mg Tirzepatide on Tue 7 Oct at 12:00 PM".
- Nothing is saved yet, and the Save button becomes "Save anyway".
- Pressing "Save anyway" with the same values saves the record.
- Changing what, how much or when clears the warning, and the record is checked again on save.
- Editing only notes, site or discomfort never warns.

**CSV import** already skips rows matching an existing weigh-in (same day, within 0.1 lb) and reports the count in its confirmation. That is unchanged.

**Tests:**
- `src/test/duplicates.test.tsx`: 5 tests, mutation-checked.
- One existing test in `rv.pain.test.tsx` logs the same dose twice a minute apart. It now confirms with "Save anyway" before its unchanged assertion.

**Still outstanding in Pack 3:** provenance (3.5) and durable per-record history.
