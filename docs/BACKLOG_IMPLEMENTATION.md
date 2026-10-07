# Master backlog implementation — 2026-10-07

The owner's complete Packs 0–60 are preserved in MASTER_PRODUCT_BACKLOG.md. Execution order is incremental; this status is not a claim that a pack is complete. Existing records and features must survive each migration. Missing data never becomes zero, none or normal.

## Current draft work

Draft PRs #4–9 are stacked: backup recovery, encrypted vault, onboarding accessibility, offline installation, clinician records and daily protein/water totals. They are not production releases. PR #9 remote head 7a19809e6c41729427eb900c2543a1826dd81e7e was verified open, draft and unmerged when this foundation step started. Its existing CI/preview results are recorded in its description.

Symptom history foundation work (part of Pack 3) adds editing, confirmation before deletion, and undo of the most recent deletion while the page remains open. All collected and legacy recorded ratings, including explicit none, now appear in history. Edits preserve identity and the original timestamp when the date is unchanged. Clearing a rating means unrecorded. Undo preserves the original record and refuses to overwrite an existing ID. Existing assertions have not been changed. This does not complete Pack 3: dose/weight undo, duplicate warnings, provenance and durable history remain outstanding.

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

Schema V2 conversion/validation and backup V3 adapters are implemented; live storage stays version 1. New domains are reserved and reject nonempty data until their validators exist. Current app protection blocks ordinary writes/removal, CSV and encrypted restoration for unsupported store versions and offers the original main data in JSON backup. See DATA_MODEL_V2.md. This is not an automatic migration. The subsequent encrypted recovery preview draft adds explicit durable recovery, but automatic pre-import snapshots and the live schema bridge remain before cutover.

## Encrypted recovery preview draft

Adds a preview-only Settings migration validation and confirmed encrypted one-generation recovery save/restore, with exact prior slots, atomic ciphertext commit, stale-preview/tab protection, rollback undo and erasure of history. Production stays unchanged. This is part of Packs 1–3, not completion of all-domain migration: live schema V2, automatic pre-import recovery, imported recovery-history restoration and the future domain schemas remain outstanding. Next: wire atomic pre-import snapshots and test the live-schema bridge in a separate draft before owner preview acceptance.
