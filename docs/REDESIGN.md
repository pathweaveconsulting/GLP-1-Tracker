# Product redesign — inventory, design system and regression checklist

Branch `claude/product-redesign`, started from `codex/record-delete-safety` at `f405d139bdfbf77ad3b6aef3567360ec5d5c85fa` (verified to contain every other remote branch, including `main`). Owner feedback: the preview felt amateurish; a coherent redesign is required before any production release. This file is the redesign's working record. It is not evidence that unperformed checks passed.

## Milestone status

| Milestone | Status |
|---|---|
| 1. Design system + navigation + Today (home) | Implemented on this branch, awaiting owner direction acceptance |
| 2. Remaining screens on the same system | Not started (after acceptance). Interim: old hard-coded purple values were mapped onto the new tokens so no screen still uses the old scheme |
| 3. Functional backlog (weight/dose editing, duplicate warnings, live schema V2 bridge) | Not started; order unchanged from BACKLOG_IMPLEMENTATION.md |

## Design system (milestone 1)

- **Tokens** (`src/index.css`, `@theme`): canvas `#f6f8fa`, surface white, sunken `#eef2f6`, line `#dbe2ea`, control border `#7b8a9c` (3.3:1); ink `#0f1f33`, ink-2 `#2e3e54`, muted `#4f5d70`, subtle `#5a6779`; brand blue `#1d5aa6` / strong `#164a8a` / soft `#e9f1fb`; positive green `#1c6f4c`, caution `#8a5300`, danger `#b42318` with soft tints. All text tokens ≥ 5.0:1 on every light and tinted surface. Not GLAPP's scheme and not purple. Pathweave's own colours could not be fetched (pathweave.co.in is blocked by this environment's network policy); to adopt them, change these values only.
- **Type**: the platform UI font (no download, nothing fetched from another site). Page title 24/28px, panel titles 15px semibold, body 14–15px, captions 13px, tabular numerals for figures.
- **Shape**: one panel style (14px radius, 1px line, no shadows), 10px control radius, 44px minimum tap height for default buttons.
- **Focus**: one global `:focus-visible` outline in the brand colour.
- **Components** (`src/components/ds`): `Button` / `buttonClass`, `Panel`, `PageHeader`, `Stat`, `StatusLabel` (icon shape + words, never colour alone), `EmptyState` (says what is missing; never a zero, "normal" or "on track").
- **Shared primitives restyled**: `Modal` (bottom sheet on phones), `ConfirmDialog`, `Toast`, vault gate and lock bar, backup reminder.

## Navigation (master backlog Pack 4)

Primary: Today `/`, Progress `/weight`, Health `/effects` (also `/health`, `/daily`), Medication `/doses` (also `/this-week`), Insights `/results` (also `/reports`, `/recommendations`). Desktop sidebar shows all five then Records (All history, Calendar, Protein & water when enabled or used, Health summary), Understand (This week, Reports, Guidance), Account (Settings & data). Phone tab bar: Today, Progress, Health, Medication, More (menu with Insights and every secondary page). `aria-current="page"` follows the destination, including its related routes.

## Today (master backlog Pack 5)

Header with local date, medication and week since the saved start date. **Today's records**: injection, weight, check-in (and protein & water when enabled), each with "Recorded today / Not recorded today", the last record and its action. **Medication**: last recorded dose, days since, next date only "if weekly" (no saved schedule exists yet, Pack 6), week position, estimated level with "About the estimated level". **Weight**: current, change since start, recent pace (or "Needs 3+ weigh-ins over 2+ weeks"), goal, BMI with footnote. **Latest check-in**: last 7 days only, with date, ratings in words and a 3-step scale; unrecorded ratings say "Not recorded". **Worth a look**: up to three items computed from the user's records; the panel disappears when there are none.

Moved, not removed: the estimated-level chart is now on Medication (`/doses`); the weekly weight-and-injections chart is now on Progress (`/weight`, "Weight Log & Table" view), with a labelled range control and a legend.

## Route and feature inventory (regression checklist)

Each item must still work after every redesign step. Automated coverage exists for most; device checks remain manual.

| Route | Features to preserve |
|---|---|
| Vault gate | create vault (passphrase + confirm, ≥14 chars), save recovery key, unlock with passphrase or recovery key, lock bar, auto-lock after 10 min, download unsaved encrypted backup |
| Onboarding | three steps, explicit medication/date, review, kg/cm and lbs/ft/in, welcome-back prefill |
| `/` Today | as above; opens Log shot / Log weight / Log how you feel / Notifications / About the estimated level / menu |
| `/weight` Progress | journey dashboard, weight table, edit-free delete with confirmation and undo, CSV import with unit detection, progress chart, weekly weight-and-injections chart |
| `/doses` Medication | estimated-level chart and explanation, site counts, sort, delete with confirmation, stale-record refusal, undo of last deletion |
| `/effects` Health | symptom log, edit, confirmed deletion, undo, unrecorded vs none |
| `/daily` | protein (g) and water (mL) per date, blank distinct from zero, edit by date, encrypted slot |
| `/results` Insights | journey / side effects / progress tabs, heatmaps with marks and tables, trial reference (illustrative), side-effect analytics |
| `/this-week` | week position, illustrative weekly pattern (labelled), learn-more dialog |
| `/health` | health summary, next shot (if weekly), level, symptoms this week, safety |
| `/calendar`, `/logs` | month navigation; all records list |
| `/reports` | weekly/monthly reports, opt-in doctor records, print / save PDF |
| `/recommendations` | sourced guidance ("From your logs" / "General"), read more |
| `/settings` | profile edit, units, backup (JSON/CSV/encrypted), restore with atomic recovery, recovery points, offline install, reminders, erase |
| Global | storage error / read-failure / unreadable-data notices, error boundary downloads, safety notice, skip link, toasts |

## Not verified

Real-browser vault creation and unlock (owner must enter credentials), keyboard order and screen readers, real phones, print/PDF, offline install, rendered colours on real displays. Screenshots in the PR were taken from the development-only design preview (`/design-preview/`, synthetic data, in-memory storage stand-in), not from the vault-gated app.

## Resume instructions

1. Read AGENTS.md, this file and `docs/RESUME_CHECKPOINT.md`; verify branch head and PR state yourself.
2. Do not start milestone 2 until the owner accepts the Today/navigation direction; record their feedback here.
3. Keep every existing assertion; add focused tests for new behaviour; run `npx tsc --noEmit`, the full suite (UTC and New York), the feature-flag build and `node scripts/contrast.mjs` before each push.
