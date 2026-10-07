# GLP-1 Companion

A calm, local-first companion for people on a GLP-1 journey. It explains **what is happening, why, what to expect next and what to do today**, using only what you have logged yourself.

> Not medical advice. It is a personal log and a simplified explainer, not a substitute for your prescriber or pharmacist.

## Principles

The product constitution is in [`AGENTS.md`](./AGENTS.md). The rules that shape the code:

- **Never invent data.** Every number on screen comes from the user's logs, or is clearly labelled *illustrative* or *general*. When there is not enough data we show a dash and say what is needed (for example "Needs 3+ weigh-ins over 2+ weeks"), because if confidence is low the app says so.
- **Compare people with themselves,** not with an average user.
- **No shame, no alarm.** Calm wording, "often" / "typically" instead of absolutes, and a clear "when to get help" panel.
- **Derived-data logic lives in small, tested, pure modules** under `src/lib`, not in components.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | Type-check (`tsc --noEmit`, strict mode) |
| `npm test` | Run the whole test suite once |
| `npm run contrast` | WCAG contrast audit of text colours (also enforced by a test) |
| `npm run test:watch` | Watch mode |

Run the tests under another timezone with e.g. `TZ=Pacific/Auckland npm test`.

## File map

```
src/
  App.tsx              Routes (lazy-loaded) and the first-run gate
  pages/               One file per screen (Onboarding, ControlCenter, Weight, Reports, Settings, ...)
  components/          Dashboards, charts, shared UI (Modal, ConfirmDialog, Toast, SafetyNotice)
    modals/            Log dose / weight / symptoms, profile, notifications, mobile menu
  store/
    useStore.ts        Zustand store, persisted to localStorage (version 1)
    migrate.ts         Migration from the old unversioned build (strips demo data)
  lib/
    units.ts           Pounds are the canonical stored unit; convert only at the edges
    dates.ts           Local-calendar-day helpers (date-only entries are anchored at local noon)
    medications.ts     Per-drug reference data, brand-name mapping, dose warnings
    glp1Utils.ts       Simplified PK model, weekly-cycle phases, injection-site rotation
    insights.ts        Weekly rate, goal projection (refuses to guess), milestones, plateaus
    symptoms.ts        Severity helpers and summaries of what was actually logged
    sideEffectsAnalytics.ts, reports.ts, notifications.ts, recommendations.ts
    csv.ts, tidyExport.ts, backup.ts, weightImport.ts, dataTransfer.ts   Import / export
  test/                Test setup, fixtures, smoke / accessibility / per-feature tests
```

## Privacy

There is no backend or account. This branch stores records, rescue copies and backup reminder metadata in an **encrypted local vault** (`glp1-encrypted-vault`). Create a unique passphrase and save the recovery key privately before continuing. Existing plaintext records are removed only after verifying the encrypted copy. The app locks after ten minutes of inactivity. Clearing browser data still deletes records; keep encrypted backups. See [SECURITY.md](./SECURITY.md) for the threat model and limits. Production does not gain these protections until this branch is approved and released.

Data formats you can export from Settings:

- **CSV** with columns `Type, Date, Item, Value, Unit, Details, Notes` (UTF-8 with BOM, weights in your chosen unit, spreadsheet-formula-safe).
- **Encrypted JSON backup** (`format: "glp1-encrypted-vault"`, `version: 1`) unlocked with the passphrase or recovery key, then strictly validated before replacement. Legacy plaintext backups remain importable. CSV exports remain unencrypted.

If stored data can't be read (invalid JSON, rows that fail validation), the app keeps the readable rows, shows a notice, and keeps the original bytes in an encrypted rescue slot until you erase data from Settings. If the browser refuses to save (storage full or blocked), a banner offers a backup download.

Weights can also be imported from a CSV (up to 5 MB / 50,000 rows) (Weight page → import button).

## Offline installation

`npm run build` generates `sw.js` and `offline-assets.json` from all built public files, checking the HTML references, icons and chart chunk before succeeding. It does not cache health records or backups. Registration is opt-in in Settings and requires `VITE_ENABLE_OFFLINE=true`; the flag defaults off. This downloads the chart files deliberately, after onboarding, without loading them on the first screen. The manifest provides browser installation metadata and icons.

The worker caches the app shell and built assets for offline use; it ignores external URLs, non-GET requests and unknown resource paths. Installation failures remove the incomplete cache. Updates use the browser's waiting lifecycle, with no forced reload or `skipWaiting`. Save a backup, close all app tabs and reopen before testing a new build. Test actual offline navigation and installation on the devices you use; unit checks do not prove browser installability. In-app reminders do not provide background or exact-time notifications.

`VITE_ENABLE_DAILY_LOGS` is reserved for the next separately reviewed tracking enhancement. Never put credentials in a `VITE_*` value.

## Clinician report preview

`VITE_ENABLE_DOCTOR_REPORT=true` enables an opt-in individual-record appendix on Reports. Choose a week/month, review the notes, tick “Include individual records and notes for my clinician”, then use “Print / save PDF”. The browser print dialog may offer Save as PDF; the app does not claim the file was saved. The appendix preserves separate symptom entries, explicit None ratings, custom ratings, dose notes and unknown versus zero injection discomfort. Date/time and timezone are labelled. Printed/PDF copies are unencrypted selected-period reports, not restorable backups. Actual print pagination and assistive-technology behaviour need device verification before enabling production.

## Setup and units

New onboarding uses three steps: medication/weight, height/start date, then review and the full safety notice. Medication and date are blank until explicitly selected. Returning users see values derived from their preserved entries. Kilogram users enter height in centimetres; pounds users enter feet/inches. Canonical storage remains pounds and inches. Goals must be below starting weight for this weight-loss tracker; the app does not prescribe a target. Saving an unchanged profile keeps the exact original values, avoiding rounding drift.

## Testing

`vitest` + Testing Library in jsdom. The suite includes:

- a **smoke test that renders every route** with the real `<App/>` in four modes (empty / populated × lbs / kg) and fails on `NaN`, `Infinity`, `undefined` or `[object Object]` in the page text;
- an **accessibility test** (accessible names for every control, one `<h1>` per page, dialog semantics, Escape and focus handling);
- unit tests for every `src/lib` module and the store migration;
- the whole suite runs in CI under five timezones (UTC, Los Angeles, Auckland, Kolkata, New York; the New York run executes the DST tests).

Every new assertion should be mutation-checked at least once (break the code, watch the test fail, restore it).

## Deploy

The app is a static site with no server, database or network calls: `npm run build` writes everything to `dist` and any static host can serve it. Saved data lives in each visitor's own browser (`localStorage`) and is per address, so a new domain starts empty.

Cloudflare Pages production is hosted at https://glp1.pathweave.co.in/ in project `glp-1-tracker`. Release workflow: draft PR → preview checks → owner approval → merge to `main` → production checks. Build settings:

1. Workers & Pages → Create → Pages → connect this GitHub repository.
2. Build command `npm run build`, output directory `dist`, Node 20 or later.
3. Production branch `main`; other branches get preview URLs. Add the domain under Custom domains.

Notes:

- `public/_headers` is copied into `dist` by the build. It sends `X-Robots-Tag: noindex, nofollow` so a test site stays out of search results, plus a few hardening headers and long caching for the hashed files in `/assets`. **Delete the `X-Robots-Tag` line before the site is meant to be public.**
- The app uses browser-history routing, so deep links such as `/results` need the host to fall back to `index.html`. Cloudflare Pages does this when the project has no top-level `404.html`; confirm it on the first deploy by opening a deep link and refreshing.
- `public/_headers` sets a Content-Security-Policy (CSP) with a self-only script policy, restricts connections to this origin (`connect-src 'self'`) for static offline preparation, disallows framing and form submission, and disables camera, microphone and location. Inline CSS remains allowed for chart/UI styles; inline scripts are prohibited. Recheck the actual response headers and every route on preview before release.
- The medication values and safety wording still need clinician review (see the next section) before the site is shared beyond testers.

## Review medication reference data

`src/lib/medications.ts` holds approximate half-lives, dose steps, maximums and missed-dose notes. They were written conservatively and are marked *approximate; verify against current prescribing information*. **A clinician or pharmacist should review them against current prescribing information before release.** They are used only to draw the simplified level estimate and to warn about unusual amounts; the app never tells anyone what dose to take.

Items a clinician should check (nothing here was changed in code by the wording pass; only labels were added):

- `medications.ts`: Tirzepatide half-life 5 d, steps 2.5–15 mg, max 15 mg, weekly interval; Semaglutide half-life 7 d, steps 0.25, 0.5, 1, 1.7, 2, 2.4 mg, max 2.4 mg (newer, higher Wegovy doses may make this maximum warn wrongly; different semaglutide products have different ladders); the generic "Other" text. These drive only the simplified level estimate and the "unusual amount" warnings.
- **Missed-dose wording** is now one product-neutral sentence ("Missed-dose instructions depend on your exact product. Check your leaflet or ask your pharmacist. This app does not tell you to take a late or extra dose."). The earlier 4-day/5-day windows were removed from user-facing text; reinstate them only per identified product after label review.
- **Retatrutide is not modelled** (`modelled: false`, no half-life, no interval): no level curve, percent of peak, phase text or due date, only "No estimate available for this medication" plus the investigational note. A clinician should confirm that is the right decision, and whether the dose-form amount/maximum checks should say anything for it.
- `SafetyNotice.tsx`: the red-flag list, the "examples, not exhaustive" sentence, and "If you miss a dose" (the windows could be read as permission to dose late, so the leaflet/pharmacist line sits directly under them).
- `doseWarning` texts ("above the usual maximum", "isn't one of the usual steps").

Also review before release: the wording of `SafetyNotice` (the red-flag list is labelled as examples, not exhaustive), and the decision that oral semaglutide (Rybelsus) is treated as "Other" because the weekly model does not describe a daily tablet.

The reference curves in `WeightVsTrialsChart` (labelled "Illustrative reference interpolation", dashed; interpolated between approximate published trial endpoints, with the former unsourced Retatrutide min/max band removed) and the illustrative weekly-pattern chart on *This Week* also need review.

## License

No license has been chosen yet. Until the owner adds one, all rights are reserved.
