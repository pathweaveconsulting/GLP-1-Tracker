# GLP-1 release acceptance and remaining scope

Updated 2026-10-07. This is a release checklist, not evidence that unperformed checks passed. Production merge remains behind owner approval. Do not change DNS or provision paid services.

| Feedback | Implemented checkpoint | Remaining acceptance |
|---|---|---|
| Data loss / backups | Versioned JSON import/export, CSV, honest periodic reminders (PR #4); encrypted vault/backups (PR #5) | Real-browser migration, failed saves, recovery-key unlock, lock, replace confirmation, export/re-import with weight/dose/symptom/daily rows; privately retain backups |
| Migration / recovery | Schema-V2 validation without live cutover; confirmed one-generation encrypted recovery-point save/restore and rollback undo | Real-device recovery after lock/reopen, failed writes, stale tabs, all-slot fidelity and erasure; automatic pre-import snapshots and live-schema bridge are still pending |
| Strong stored-data encryption | User-held secrets and AES-GCM vault; no key escrow | Independent security review; encryption cannot prevent an operator replacing delivered JavaScript from capturing the next unlock |
| External attack protection | Static app, CSP, no external network allowance, hostname-only Cloudflare guard | Actual response-header checks, account MFA/collaborator review, penetration test if needed; no claim of unhackability |
| Heavy initial chart download | Lazy app/routes; preview initial DOM assets contain no Recharts preload | Device Lighthouse and cold-load measurements; deliberate offline preparation downloads charts later |
| Consent and long mobile onboarding | Three steps, explicit medication/date, review, labels, focus, unit conversion, validation (PR #6) | Actual screen readers, keyboard order, narrow devices and touch targets |
| Height units | kg/cm and lbs/ft/in with exact unchanged profile preservation | Real-device conversion/edit workflow |
| Offline / installability | Build-derived public asset worker, manifest/icons, opt-in flag and waiting updates (PR #7) | Install iOS/Android/desktop; turn network off, reopen and refresh each route; verify cached update waits until all tabs close |
| Doctor PDF | Native Print / save PDF with opt-in individual records/notes and plaintext warning (PR #8) | Actual PDF/print pagination, long notes, timezone and record fidelity; never call this a backup |
| Protein/water | Daily totals with blank distinct from zero, encrypted slot, backup version 2, CSV and period report; separately reviewed draft | Real-device logging and exact restore; no medical intake targets |
| Dose, rotation, level chart, symptoms | Already present in baseline; preserve as regression checks | Verify observed behaviour after vault migration; model estimates and product references need clinician review |
| Reminders | In-app notifications/reminders; backup prompts | Background or exact-time dose reminders are not implemented. Choose push/native design and consent before promising them |
| Languages | Not implemented | Choose target languages; translate the full interface and review with native speakers; clinical/safety translations need clinician approval. Do not label a partially translated app fully localised |
| Indian brand names / leaflets | Existing names and oral-product exclusion wording need review | Pharmacist/clinician checks for exact product, route, market and current prescribing information. Do not attach one brand leaflet to a generic drug or give late-dose permission |
| Retatrutide | Existing investigational wording; no new label facts or values changed in this work | Clinician must check current regulatory status in each target market, trial status and all reference values |
| Optional encrypted sync | Not provisioned | Owner-approved backend choice, authentication, threat model, key ownership/recovery, conflict handling, deletion and cost controls before implementation |
| Apple Health / Google Fit | Not implemented | Native wrapper and platform permissions needed; browsers alone are insufficient for those integrations |
| Licence | No LICENSE added | Owner must choose a licence and check third-party asset permissions |

## Required human clinical checks

Every existing medication half-life, dose step, maximum, missed-dose window and Retatrutide value; SafetyNotice and phase wording; oral semaglutide/Rybelsus decision; trial reference curves in WeightVsTrialsChart and the labelled illustrative weekly-pattern chart. The app must never substitute these references for a prescription or treat symptoms as normal without clinician assessment.

## Not verified on devices

Credential-gated preview behaviour; keyboard order and screen readers; mobile layout; actual PDF and print output; rendered chart/heatmap colours; true service-worker installation, offline navigation and update lifecycle. Automated contrast checks cover parsed token/text/focus colours, not every rendered composite, chart overlap, colour-only meaning or assistive technology.

After these checks: owner approves the concrete preview, merge stacked changes in dependency order (retarget later PRs as necessary), wait for production build, verify HTTPS, actual headers, privacy claims and the main journey. Compare production commit with the approved preview. Keep existing domain/DNS untouched.
