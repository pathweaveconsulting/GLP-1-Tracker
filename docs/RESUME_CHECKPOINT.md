# Paused release checkpoint — 2026-10-07

Owner requested a safe pause. Do not continue work until asked to resume. No production merge or DNS changes were made in this work session.

## Branches and review

- Production main remains d7465c273d3911edf468941b00e36471380ae0b8; live app: https://glp1.pathweave.co.in/.
- Backup draft PR: https://github.com/pathweaveconsulting/GLP-1-Tracker/pull/4.
- Encrypted-vault draft PR: https://github.com/pathweaveconsulting/GLP-1-Tracker/pull/5, stacked on backup fixes. Remote head f792f2bf5c89b8de2723ac177e16ee36272841c5. Its six CI jobs (five timezones and audit) passed in run 37568233091.
- Onboarding draft PR: https://github.com/pathweaveconsulting/GLP-1-Tracker/pull/6, stacked on encrypted vault. Remote head 79386fecd7e49f891051d9025d687ced073570b1; tree 841b71cfc2df44cd78449392203973d4d4a4f1e2. CI run 37569154337 reported success; individual jobs have not yet been inspected.
- Current local branch: codex/offline-install, based on local onboarding commit 7d0fa2c. Local and connector-created remote commits have different histories but matching trees.
- Offline work is saved locally at this checkpoint. It has not been published to a remote branch or draft PR and has no verified preview deployment.

## Offline checks actually run

Commands: `npx tsc --noEmit && VITE_ENABLE_OFFLINE=true npm run build && npm test -- --maxWorkers=2 && node scripts/contrast.mjs && git diff --check`.

Exit 0. Full UTC suite: 58 files, 617 passed, 7 DST tests skipped, 624 total. Build: 48 public assets, cache glp1-static-88617cc41e1ddf20374f673a; entry 222.24 kB (71.03 gzip), CSS 51.95 kB (9.60), App 101.34 kB (30.54), Settings 19.78 kB (6.73), Recharts 436.23 kB (124.19). Contrast: 695 text and 111 chart/focus checks plus placeholder check, zero failures. No fresh full New York suite or npm ci/audit was run for the offline step; no dependencies were added. Vault previously passed all 613 tests in New York and audit reported zero vulnerabilities. Onboarding targeted New York tests passed 102 tests.

Offline artifact and lifecycle targeted tests: 3 files, 13 passed. Tests exercise generated worker caching and failure cleanup using fixtures; actual browser installation, offline navigation and update lifecycle remain unverified. Documentation/checkpoint edits followed the full test run; final diff whitespace check passed before committing.

## Live security configuration

Only a hostname-scoped Cloudflare guard was added: ruleset 731d190551df423d8ef2384e8fc875aa, rule f06b5b7263e546d381d9643f40137a30. Expression:

`(http.host eq "glp1.pathweave.co.in" and (not http.request.method in {"GET" "HEAD" "OPTIONS"} or starts_with(lower(http.request.uri.path), "/.git") or starts_with(lower(http.request.uri.path), "/.env")))`

Request Trace with origin requests skipped: app GET / and /results and OPTIONS / were allowed (200, custom rule unmatched); POST /, GET /.env and GET /.git/config blocked (403, custom rule matched); POST on geetaverse hostname did not match (200). Free Managed Ruleset evaluated on allowed traces. HEAD trace is unsupported and was not verified. These are configuration simulations, not live attack tests or a penetration test. No root/www/email/other-app DNS or rules were changed.

## Resume order

1. Read AGENTS.md, this checkpoint and git status; verify branch and tree. Inspect individual onboarding CI jobs and preview result.
2. Verify the actual offline dist asset graph outside source, publish codex/offline-install through GitHub connector, including PNG blobs as base64, from remote onboarding head above. Compare remote and local trees. Open stacked draft PR into codex/onboarding-accessibility.
3. Add only offline branch to Pages preview allowlist and enable VITE_ENABLE_OFFLINE=true in preview settings, preserving existing configuration and secrets. Do not enable production flags yet. Verify preview deployment and public setup UI.
4. Implement separately reviewed daily protein/hydration totals with missing values distinct from zero, encrypted persistence, backup/restore compatibility and doctor report. No tracking/report/localisation code has been implemented yet.
5. Localisation needs language selection and native/clinical review. Sync/native integrations remain conditional; do not provision backend, paid services or invent regulatory facts.
6. Complete human preview acceptance before requesting production merge approval. Browser credential creation requires user handoff: do not enter or seed a vault secret to bypass this requirement. Vault migration/unlock/lock/export/restore, device offline install, keyboard/screen-reader/mobile/print checks remain pending.

Encrypted-vault preview: https://d1756b8b.glp-1-tracker-388.pages.dev/. Agent observed setup labels and own-origin initial assets; no real-browser vault creation or unlock occurred. Production still stores records in plaintext until reviewed vault changes are merged and deployed. Browser encryption cannot protect an unlocked session from an administrator replacing delivered JavaScript. Clinical numbers/wording and licensing still need human review.

## Resumed progress — 2026-10-07

Offline work is now published in draft PR #7: https://github.com/pathweaveconsulting/GLP-1-Tracker/pull/7. Remote head b57595d4ca3ed12eeae851345b58063fc8919a77, tree bafdd70f52c2c9a66566e6f293357da3d7e2131b matches saved local offline commit. All six CI jobs in run 37595665647 succeeded (five timezone build/test jobs plus audit). Preview https://fbcdffdb.glp-1-tracker-388.pages.dev/ deployed successfully for that head; browser setup rendered labelled credential fields, manifest/icon links, own-origin entry/react/CSS assets, no chart preload. Only extension metadata error observed. No credential entered. Actual copied dist was exercised outside source using generated-worker VM: 48 assets cached byte-for-byte, deep link served without network fallback. Preview flag VITE_ENABLE_OFFLINE=true added and offline branch allowlisted; production flags untouched. Onboarding run 37569154337 individual six jobs also verified successful.

Doctor-report work is on local codex/doctor-report. Feature flag VITE_ENABLE_DOCTOR_REPORT defaults off; Reports gains opt-in individual weight/dose/symptom records and notes, explicit missing-vs-none/zero wording, timezone label and native Print / save PDF action. No new dependency, clinical value or storage schema change. Checks run: typecheck exit 0; targeted four tests passed in UTC and New York; feature-enabled build plus full UTC suite and contrast exit 0. Full suite: 59 files, 621 passed, 7 DST skips (628 total). Build 48 public files; entry 222.25 kB/71.03 gzip, CSS 52.28/9.72, Reports 13.61/4.40, Recharts 436.23/124.19. Contrast 699 text,111 nontext plus placeholder, no failures. Documentation updated after suite; final whitespace check required before commit. Actual print pagination/PDF/device/screen-reader checks not run. Publish a stacked doctor-report draft into codex/offline-install next, then implement daily logs with encrypted persistence and backup fidelity. Daily logging/localisation/sync/native remain unimplemented.

## Daily logging checkpoint — 2026-10-07

Doctor-report remote draft is PR #8 (https://github.com/pathweaveconsulting/GLP-1-Tracker/pull/8), remote head 71271de1ae6104b21c78bddc9ca0dda4672c875b, matching local tree 8923546ec64037fde3b15a0d36fda978640c71ca. Each of six CI jobs succeeded in run 37596536854. Preview https://76493af3.glp-1-tracker-388.pages.dev deployed successfully. No real-browser report/print check occurred. Preview-only VITE_ENABLE_DOCTOR_REPORT=true added and branch allowlisted; production flags unchanged.

Daily logging implemented on codex/daily-logs, stacked on doctor-report. Daily date totals (grams/mL and notes), blank distinct from zero, update-by-date rather than duplicate addition, no prescribed targets, no plaintext fallback. Dedicated encrypted slot with reactive reading; invalid daily bytes block new daily saves; queue failures preserve unsaved daily rows in encrypted locked recovery. History remains readable/exportable if entry flag is disabled. Version-2 JSON backups strictly validate daily rows; version-1 compatibility retained; old-backup restoration explicitly warns that daily history is replaced with none. CSV and period reports include totals; notes in clinician reports remain opt-in. Whole-data reset/restore includes daily slot. Restore success toast now waits for encrypted flush instead of claiming persisted success on quota failure.

Actual checks: npx tsc --noEmit exit 0; targeted 5 files/32 tests passed after one initial legacy-backup shape failure. Fixed implementation to omit the new property when old encrypted backups contain no daily slot; original exact assertion stayed unchanged. Targeted New York 3 files/15 tests passed with zero skips. Full feature-enabled build, full UTC npm test, contrast and git diff --check exit 0: 60 files,626 passed,7 DST skips,633 total; build49 assets; entry225.07kB/72.04gzip, CSS52.28/9.72, App102.48/30.94, DailyLogs4.38/1.70, Reports14.67/4.73, Settings20.20/6.92, Recharts436.23/124.19. Contrast707 text,112nontext,placeholder no failures. No fresh full local New York suite/npm ci/audit; CI still to verify for daily draft. Warnings npm proxy configuration deprecation and Vitest repeated jsdom performance advisory. New files have no network calls or focused/skipped/todo tests. No existing assertion changed.

Publish daily draft from doctor remote head and compare exact trees; enable VITE_ENABLE_DAILY_LOGS=true only in previews and allowlist codex/daily-logs. Capture actual CI and preview results in draft description. See docs/RELEASE_ACCEPTANCE.md for every remaining feedback item. Production source/main/DNS unchanged; only earlier hostname firewall guard is live. Actual credential-gated UI, mobile, install/offline, print, keyboard/screen-reader, rendered chart/heatmap colours and clinical/licence reviews remain unverified. Localisation, background dose reminders, sync and native health integrations remain unimplemented/conditional and must not be represented as complete.

## Symptom-history foundation — 2026-10-07

Owner requested immediate continuation against the complete Packs 0–60 backlog. Preserved it as docs/MASTER_PRODUCT_BACKLOG.md (Markdown hard breaks normalized without removing items); execution status and remaining sequence are in docs/BACKLOG_IMPLEMENTATION.md. Current branch codex/symptom-history-safety, based on local daily cfe98b054aebd5c5c183b74ea8e6934a530507da. Remote PR #9 verified open/draft/unmerged at head 7a19809e6c41729427eb900c2543a1826dd81e7e. Its six jobs previously passed in run 37597912520 and preview is https://b18aab89.glp-1-tracker-388.pages.dev/.

Part of Pack 3 implemented: symptom edit, confirmed deletion and last-deletion undo while page stays mounted. History now displays all collected/legacy recorded ratings, including explicit none and custom ratings. Unchanged date retains exact timestamp; record ID and legacy fields preserved. Clear action makes a rating unrecorded. Duplicate-ID undo never overwrites. No schema/dependency/clinical-number change. Remaining Pack 3 work includes dose/weight undo, duplicate warnings, provenance and durable history.

Actual commands: npx tsc --noEmit; npx vitest run src/test/strict-qc.regressions.test.tsx src/test/symptomHistory.test.tsx --maxWorkers=2; same targeted command with TZ=America/New_York; VITE_ENABLE_OFFLINE=true VITE_ENABLE_DOCTOR_REPORT=true VITE_ENABLE_DAILY_LOGS=true npm run build; node scripts/contrast.mjs; npm test -- --maxWorkers=2; git diff --cached --check. Final exits 0. Targeted tests 2 files/8 passed in each zone. Full UTC 61 files/629 passed/7 DST skipped/636 total. First full run failed one existing assertion because the new clear control was marked pressed; corrected implementation, kept assertion unchanged, final full run passed. Build49 assets; entry225.23kB/72.07gzip, CSS52.78/9.78, Effects5.17/1.96, LogEffectsModal5.89/2.33, Recharts436.23/124.19. Contrast710text112chart/focus plus placeholder, zero failures. Warnings npm http-proxy config deprecation and jsdom performance advisory. No fresh local npm ci/audit or full local New York run; no dependency changed.

Cloudflare only allowed this new preview branch; production remains main, no production VITE_ENABLE flags. No production merge or DNS change. Publish matching tree as stacked draft into codex/daily-logs; verify six individual CI jobs and preview next. Real-browser credential-gated CRUD/undo, mobile/accessibility, offline installation and print remain unverified; owner must enter vault credentials personally. Next foundation work: versioned schema/migrations, all-domain backups/rollback, remaining CRUD. Clinical registry and qualified reviews remain required; safety-hold Pack 40 stays on hold.

## Versioned data foundation — 2026-10-07

Symptom draft #10 verified open/draft/unmerged at fcfa2bc4a168a475220c0db10f045a9717a5c793, tree acdd799b56b2bc4b75bf3dac50a983cbb36e2857. All six CI jobs in run 37600615748 verified successful. Current local branch codex/versioned-data-foundation is stacked on that matching local tree.

Implemented strict schema-V2 conversion/validation and backup-V3 adapter. Legacy symptoms retain IDs/timestamps/ratings independently from current protein/water check-ins. Unknown creation/update dates and integration/import IDs stay null. Deterministic migration preparation returns original bytes on success and failure; it does not write live storage. Unknown fields, duplicate IDs and lossy values are rejected. Future domains are reserved/empty until their validators exist. Live Zustand store remains version 1; V3 export helper not connected to UI, normal backups stay V1/V2. Durable encrypted pre-operation rollback and user-confirmed migration preview remain next before a live cutover. Full details: docs/DATA_MODEL_V2.md.

Live protection added: check unsupported outer versions before sanitization in plaintext/encrypted adapters, pause writes/removal, preserve original main data in JSON downloads, reject CSV/unsupported encrypted restoration, show truthful unsupported-version warning. No dependency, medical value or target added. All existing test assertions unchanged.

Actual checks so far: npx tsc --noEmit final exit0; initial targeted six files/32 tests passed; final targeted model/vault/backup recovery three files/10 tests passed; targeted New York final model/vault two files/six tests passed; earlier New York model/vault/phase6 three files/15 tests passed. Existing fixes file alone passed46/skipped1. Build with VITE_ENABLE_OFFLINE/DOCTOR_REPORT/DAILY_LOGS=true and contrast exit0;49 assets,entry225.70kB/72.19gzip,CSS52.78/9.78,App106.98/32.31,Settings20.33/6.97,Recharts436.23/124.19;contrast710text112chart/focus plus placeholder,zero failures. Diff whitespace exit0. One initial typecheck failed due JSX in .ts test filename; renamed .tsx and final typecheck passed. Initial full run while files changed and other checks overlapped failed one renamed-file discovery and three5-second timeouts; subsequent two-worker final-tree run had634passed,7DSTskips,one lazy-heading wait failure. That existing fixes file passed alone without assertion/timeout changes. Final full single-worker suite is running at this checkpoint; do not infer a pass. See upcoming draft PR body for actual final results. No fresh local npm ci/audit/full New York suite; new draft CI still to verify. Warnings npm http-proxy config and Vitest environment performance advisory.

Cloudflare added only codex/versioned-data-foundation to existing preview allowlist. Production main and absent production feature flags verified; no merge/DNS/paid services. Publish matching tree as draft into codex/symptom-history-safety; record actual CI and exact preview head/status. Credential-gated browser recovery, migration and device/accessibility checks unverified. Production approval remains required. Durable rollback, all-domain backup preview and live model cutover are NOT complete.

## Encrypted recovery preview — 2026-10-07

Foundation PR #11 verified draft/unmerged at remote head 27f178ecb1d21954c1a939b220c062edadb4cb29, matching local parent 83a4bec274133a6cfd1fcb3ac23e27b63c709cd8 / tree 57a3f8d2b637035cce963a00f881bf4aac98785b. All six individual jobs in run 37602689143 verified successful (audit and UTC/Los_Angeles/Auckland/Kolkata/New_York). Its final full single-worker suite passed 63 files/635 tests/7 DST skips; the prior pending checkpoint was historical. Preview https://c921cc51.glp-1-tracker-388.pages.dev/ was verified at the public vault setup gate only.

Current branch codex/encrypted-rollback-preview is stacked on that foundation. Adds exact one-generation encrypted recovery-point save/restore with rollback undo, strict actual-slot migration validation/counts, confirmation, blocked interaction while saving, stale-preview/tab checks, atomic ciphertext envelope write/readback, candidate decrypt verification, and history removal on whole-data erasure. A failed ordinary write is not bypassed; a failed recovery-only write can be retried without publishing changed slots. Live store remains version 1; no automatic schema activation or second canonical copy. New domains remain empty and unknown provenance stays null. Normal backup import does not restore recovery history and automatic pre-import snapshots remain pending; this is stated in UI/docs. Older vault readers reject the new slot instead of silently dropping it. See DATA_MODEL_V2.md and RELEASE_ACCEPTANCE.md.

Actual commands/results: npx tsc --noEmit exit0; npx vitest run src/test/vaultRecovery.test.tsx src/test/vault.storage.test.tsx src/test/dataModelV2.test.ts src/test/dataModelV2.vault.test.tsx --maxWorkers=1 exit0 (4 files/22 tests, before adding one concurrency test); npx tsc --noEmit && TZ=America/New_York npx vitest run src/test/vaultRecovery.test.tsx src/test/vault.storage.test.tsx src/test/dataModelV2.vault.test.tsx --maxWorkers=1 exit0 (3 files/18 tests, zero skips); npm test -- --maxWorkers=1 exit0 (64 files,644 passed,7 DST skips,651 total,264.93s). Build with VITE_ENABLE_OFFLINE/DOCTOR_REPORT/DAILY_LOGS/MIGRATION_PREVIEW=true exit0;49 public files,entry227.19kB/72.48gzip,CSS52.78/9.78,App107.25/32.40,Settings25.58/8.62,Recharts436.23/124.19. node scripts/contrast.mjs exit0:713 text,112 chart/focus plus placeholder,zero failures. git diff --check exit0. Existing assertions unchanged. Nine new tests exercise actual WebCrypto, exact bytes, quota failure, lock/unlock, encrypted exports, stale previews and mid-encryption non-cooperating tab changes, failed-queue preservation, undo, confirmation, flag-disabled history and erasure. No fresh local npm ci/audit/full New York run; no dependency changed. Warnings: npm http-proxy config deprecation and Vitest jsdom performance advisory. A process-inspection ps command failed with a sandbox library lookup error; it was not a test failure.

Cloudflare now allows this branch and VITE_ENABLE_MIGRATION_PREVIEW=true only in preview. First partial-config PATCH was rejected because production/preview fail_open values must agree; corrected PATCH preserved their existing matching values. Verified production branch remains main, no production VITE_ENABLE flags. No production merge, DNS, force push or paid services. Publish matching tree as stacked draft into codex/versioned-data-foundation and record actual remote head, CI and preview results in its description. Current draft CI/preview has not run at this checkpoint. Credential-gated real-browser recovery/migration, device layout, keyboard/screen readers, print, offline install and rendered charts remain unverified; user enters credentials personally. Clinical references and license choice remain human reviews.

Next: automatic pre-import encrypted snapshots and atomic all-slot backup restore; then test the live-schema bridge in a separate draft before owner preview acceptance. Do not claim Packs 1–3 complete or activate schema V2 prematurely. Preserve approval gates for production merge and DNS, and the safety hold on Pack 40.

## Atomic backup restore — 2026-10-07

Previous recovery draft PR #12 verified open/draft/unmerged at remote d14be488b23c2237292e43a580fc565bc1f9187a, matching local 3eac6ac0513f110018a886574d356d4894abbccf / tree 94c2643a1b59a3a4b1abc7ffb64d8e0f4c0cb064. All six CI jobs in run 37604996687 reverified completed/success. Current branch codex/atomic-backup-restore is stacked on it.

Settings encrypted backup import now captures a confirmation baseline, validates incoming and current data, commits main/daily replacements and an exact pre-import recovery point together, and hydrates only after verified saving. Quota failure leaves visible and saved data unchanged. An old backup removes the daily slot atomically, with its prior bytes available for undo. Rescue/reminder slots retained; prior exact copies also protected. Previous recovery generation replaced with explicit confirmation. Source-backup recovery history is still not imported. Repeated confirmations guarded; busy modal blocks UI. Post-commit refresh failure is reported honestly instead of claiming nothing changed. Plaintext compatibility path remains the previous implementation; production candidate is gated by VaultGate. Live schema remains version 1.

Actual commands: npx tsc --noEmit initially found an indexed-object type error; explicit VaultSlots annotation fixed it. Final npx tsc --noEmit exit0. npx vitest run src/test/atomicRestore.test.tsx src/test/vaultRecovery.test.tsx src/test/phase6.test.tsx --maxWorkers=1 exit0 (3 files/25 tests); same command under TZ=America/New_York exit0 (25 tests/no skips). npm test -- --maxWorkers=1 exit0 (65 files,651 passed,7 expected DST skips,658 total,137.75s). Build with all four VITE_ENABLE_OFFLINE/DOCTOR_REPORT/DAILY_LOGS/MIGRATION_PREVIEW flags true exit0;49 public files,entry227.19kB/72.47gzip,Settings27.19/9.11,CSS52.78/9.78,Recharts436.23/124.19. Contrast exit0:713 text,112 chart/focus plus placeholder,0 failures. git diff --check exit0. Seven new tests cover actual crypto/persistence/unlock/undo, quota failure, stale/tab changes, old backups, unsupported fields, UI confirmation and failed-save reporting. Existing assertions unchanged, no dependencies/medical values added. No fresh local npm ci/audit/full New York run. Warnings: npm http-proxy deprecation and jsdom performance advice. One read-only rg referred to nonexistent src/types.ts; actual types are src/types/index.ts.

Cloudflare added only this branch to the preview allowlist. Production remains main, no production VITE_ENABLE flags. Publish a matching stacked draft into codex/encrypted-rollback-preview and record CI/preview in its body. Credential-gated real-device behavior and all clinical/licence reviews remain unverified; do not enter browser credentials or merge production/DNS changes. Next: confirmed deletion and last-deletion undo for weights and doses, then remaining backlog in dependency order; live schema bridge and future domains stay pending.

## Record deletion safeguards — 2026-10-07

Atomic restore published as draft PR #13 at remote 95fbc533f9f9ef15ca06371ba9f4681ff222d4c7; local 98ca96dda85a543da428892835ade9cec5f8e579 and remote tree 14eb9205a1de60731213f4cfef31c937b31c86a1 match. All six individual CI jobs in run 37667002172 verified successful. Preview https://626ac036.glp-1-tracker-388.pages.dev/ deployed exact remote head; browser showed labelled vault setup, matching own-origin entry/react/CSS and manifest/icon links, no Recharts preload. Only extension metadata error seen. No credential entered or actual restore performed in browser.

Current codex/record-delete-safety adds dose/weight delete confirmation, refusal when selected records change, and undo of the latest deletion while the page stays mounted. Undo preserves exact original ID/time/value/notes/missing pain and original array position; equal-timestamp order is retained so latest-weight interpretation does not change merely due to undo. Duplicate-ID restoration refuses overwrite. Index validity guarded. These are current-store actions, not durable history or live-schema migration. No medical value, dependency or existing test assertion changed.

Actual commands: npx tsc --noEmit exit0. Targeted recordDeleteSafety and symptomHistory tests --maxWorkers=1 initially 2 files/9 passed in UTC and New York; after adding original-position preservation, final npx tsc --noEmit && TZ=America/New_York npx vitest run src/test/recordDeleteSafety.test.tsx src/test/symptomHistory.test.tsx --maxWorkers=1 exit0 (2 files/10 passed/0 skipped). npm test -- --maxWorkers=1 exit0 (66 files,658 passed,7 expected DST skips,665 total,143.17s). Feature-enabled build with all four preview flags exit0;49 public files,entry227.66kB/72.56gzip,Doses5.52/2.23,Weight13.62/4.78,Settings27.19/9.11,CSS52.78/9.78,Recharts436.23/124.19. Contrast exit0:715 text,112 chart/focus plus placeholder,0 failures. git diff --check exit0. Seven new tests cover confirmation/cancel, exact undo, stale records, duplicate IDs, latest-only/page-lifetime scope, equal-time ordering and actual encrypted persistence. No fresh local npm ci/audit/full New York run; current draft CI pending publication. npm proxy deprecation and jsdom performance warnings remain.

Cloudflare allowlisted only this preview branch. Production remains main with no production VITE_ENABLE flags; no merges/DNS/paid services/force pushes. Publish a matching stacked draft into codex/atomic-backup-restore and record actual CI/preview in its description. Real-browser credential-gated CRUD/undo/import/recovery, keyboard/screen readers, mobile, true offline installation/update, PDF/print and rendered chart/heatmap colours remain unverified. Clinical registry/reference reviews and owner licence choice remain required. User must enter credentials personally; do not bypass the gate. Next unblocked work: weight/dose editing and duplicate warnings, then live-schema bridge and future domain schemas in dependency order; do not claim the whole Packs 0–60 backlog complete. Keep Pack 40 on hold and preserve production approval gates.

## Product redesign milestone 1 — 2026-10-08

Owner feedback after phone onboarding of the combined preview: the app looks amateurish; preview NOT accepted. Priority is a coherent redesign before any production release.

Verified state before work: PRs #4–#14 open, draft, unmerged and stacked (main ← #4 … ← #14). Every remote branch, including main, is an ancestor of `codex/record-delete-safety` at f405d139bdfbf77ad3b6aef3567360ec5d5c85fa, so that head is the combined source. Clean baseline on that exact tree (separate worktree): `npx tsc --noEmit` exit 0; `npm test -- --maxWorkers=2` 66 files, 658 passed, 7 DST skips; `TZ=America/New_York npx vitest run` 665 passed; contrast 715 text / 112 chart-focus, 0 failures; `npm ci` and `npm audit` (0 vulnerabilities) exit 0.

New branch `claude/product-redesign` from that head. Milestone 1 (design system, navigation, Today) is implemented and awaits owner direction acceptance. Details, inventory and regression checklist: docs/REDESIGN.md. Screenshots: docs/redesign-preview/ (from the development-only `/design-preview/` page with synthetic data and an in-memory storage stand-in; not the vault-gated app, no credentials entered, no browser storage seeded).

Checks on the final tree are recorded in the draft PR body. No assertion in an existing test was changed. One full New York run failed once in `vault.storage.test.tsx` (auto-lock after unlock, a fake-timer race under parallel load); the file passed 4/4 alone and the next two full New York runs passed. Recorded, not hidden.

Not available in this session: Cloudflare (no connector or credentials), so no preview deployment was created and preview allowlists were not changed; pathweave.co.in is blocked by the network policy, so Pathweave's brand colours could not be read. No production merge, DNS change, force-push or paid service.

Next: owner reviews the screenshots (or a preview built from this branch) and accepts or redirects the direction. Only then milestone 2 (all remaining screens on the same system), then weight/dose editing, duplicate warnings and the live schema bridge in dependency order.

## Product redesign milestone 2 — 2026-10-08

Owner accepted the milestone 1 direction on 2026-10-08 ("direction accepted, go ahead with milestone 2") and asked not to be consulted on small decisions.

Milestone 2 is implemented on `claude/product-redesign`. Every remaining screen now uses the same design system: logging, profile and notification dialogs; Progress (journey dashboard, weigh-in table, CSV import); Medication; Health; Protein & water; Insights (all three views, trial reference, heatmaps); This week; Health summary; Reports and doctor records; Guidance; Calendar; All history; Settings (profile, backup, restore, encrypted backup unlock, recovery point, offline, erase); and onboarding. New shared pieces: `ds/Field` (input, label, help, error, choice, note, form actions) and `ds/Segmented`. The legacy `ui/button` and `ui/card` now render with design-system shapes.

Behaviour fixes found during the redesign:
- All history deleted doses and weights immediately. It now confirms, refuses a record that changed meanwhile, and offers undo, like Medication and Progress (tests added; mutation-checked).
- Insights > Progress & Benchmarks showed a time filter that changed nothing. It has been removed.
- Calendar labelled any check-in without explicit "none" nausea as "Symptom". It now says "Check-in".
- All history showed blank cells for unrated symptoms. They now say "Not recorded".
- The Progress weigh-in table coloured weight gains red. Changes are now neutral, with arrow and words.
- Injection numbering was wrong when sorted oldest first.

The contrast scanner now also checks the global `:focus-visible` outline (mutation-checked); no assertion was weakened. Results of the final checks are in docs/REDESIGN.md and the PR body. Screenshots: docs/redesign-preview/m2-*.png (development-only preview, synthetic data).

Next: functional backlog in dependency order (weight/dose editing, duplicate warnings, live schema V2 bridge).

## Dose and weight editing — 2026-10-08

Owner asked to proceed with weight and dose editing. Branch `claude/record-editing`, stacked on `claude/product-redesign` (PR #15). Details: docs/BACKLOG_IMPLEMENTATION.md, "Dose / weight editing draft". Final-tree check results are in the draft PR body. Next in dependency order: duplicate warnings (Pack 3.4), then the live schema V2 bridge.

## Duplicate warnings — 2026-10-08

Owner approved the order: duplicate warnings, then the live schema V2 bridge. Branch `claude/duplicate-warnings`, stacked on `claude/record-editing` (PR #16). Details are in docs/BACKLOG_IMPLEMENTATION.md, "Duplicate warnings draft". Next: live schema V2 bridge.

## Live schema V2 bridge — 2026-10-08

Branch `claude/live-schema-bridge`, stacked on `claude/duplicate-warnings` (PR #17).

**Design:**
- One codec reads both formats.
- The flag only offers the upgrade.
- The upgrade is explicit, with an atomic recovery point.
- Upgraded data stays upgraded.
- Daily totals stay in their own slot.

Details are in docs/DATA_MODEL_V2.md. The production flag stays off pending owner approval.
