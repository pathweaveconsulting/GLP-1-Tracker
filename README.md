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

There is no server and no account. Everything you log is stored **unencrypted** in this browser's `localStorage` (key `glp1-tracker-storage`). Anyone who can open this browser profile can read it, and clearing browser data (or using a private window) deletes it. Use *Settings → Download a backup* regularly. The app makes no network requests for your data and loads no third-party images.

Data formats you can export from Settings:

- **CSV** with columns `Type, Date, Item, Value, Unit, Details, Notes` (UTF-8 with BOM, weights in your chosen unit, spreadsheet-formula-safe).
- **JSON backup** (`format: "glp1-tracker-backup"`, `version: 1`) that can be restored, with strict validation.

If stored data can't be read (invalid JSON, rows that fail validation), the app keeps the readable rows, shows a notice, and keeps a raw copy under `glp1-tracker-storage-corrupt` until you erase data from Settings. If the browser refuses to save (storage full or blocked), a banner offers a backup download.

Weights can also be imported from a CSV (up to 5 MB / 50,000 rows) (Weight page → import button).

## Testing

`vitest` + Testing Library in jsdom. The suite includes:

- a **smoke test that renders every route** with the real `<App/>` in four modes (empty / populated × lbs / kg) and fails on `NaN`, `Infinity`, `undefined` or `[object Object]` in the page text;
- an **accessibility test** (accessible names for every control, one `<h1>` per page, dialog semantics, Escape and focus handling);
- unit tests for every `src/lib` module and the store migration;
- the whole suite runs in CI under five timezones (UTC, Los Angeles, Auckland, Kolkata, New York; the New York run executes the DST tests).

Every new assertion should be mutation-checked at least once (break the code, watch the test fail, restore it).

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
