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
