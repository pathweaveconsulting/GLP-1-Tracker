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
