# GLP-1 COMPANION
## COMPLETE MASTER PRODUCT, FIX, ENHANCEMENT & GROWTH BACKLOG

### Purpose

This is the single master backlog for the GLP-1 Companion.

It combines:

- the present GLP-1 Companion application;
- previous technical/QC findings and fixes;
- the first GLAPP audit;
- the second detailed GLAPP features/calculators/business audit;
- product enhancements;
- UX improvements;
- health-data integrity requirements;
- privacy and security;
- accessibility;
- reporting;
- supply;
- reminders;
- public calculators;
- content/evidence;
- localisation;
- AI;
- integrations;
- monetisation;
- referrals;
- SEO/growth;
- future cloud/native possibilities;
- features intentionally placed on safety hold.

Nothing is excluded merely because it belongs to a later implementation phase.

The packs define **execution order**, not scope.

---

# MASTER PRODUCT PRINCIPLE

The product should operate as one connected system:

**Today**
→ what matters now

**Record**
→ medication, weight, check-in

**Understand**
→ trends, patterns and context

**Review**
→ timeline, calendar and reports

**Plan**
→ schedule, reminders and medication supply

**Share**
→ clinician-ready reports and user-controlled exports

**Learn**
→ reviewed evidence and educational content

**Ask**
→ AI over the user's own data, later

**Discover**
→ public calculators/tools and search content

**Grow**
→ referrals, premium insights and broader ecosystem

---

# GLOBAL STATUS LABELS

Every backlog item should carry one of:

### EXISTING
Already substantially present.

### IMPROVE
Existing functionality needs enhancement.

### NEW
Needs implementation.

### P2 / FUTURE
Valid feature but not required for the core release.

### SAFETY HOLD
Captured in the roadmap, but implementation requires separate clinical/legal/product approval.

---

# PACK 0 — PRODUCT GOVERNANCE & NON-NEGOTIABLE RULES

## 0.1 No rewrite

**Status: GLOBAL RULE**

The current application contains valuable working functionality.

Enhance incrementally.

Do not rebuild simply because another application structures the feature differently.

---

## 0.2 Existing data must survive

Every change must preserve:

- dose records;
- weights;
- symptom/effect logs;
- settings;
- backups;
- imported records.

No feature is complete if historical user data becomes unreadable.

---

## 0.3 Missing health information remains missing

Never convert:

- unanswered;
- blank;
- unavailable;
- not tracked

into:

- zero;
- none;
- normal;
- healthy.

---

## 0.4 Recorded data vs estimate

Every screen must distinguish:

### USER RECORDED

actual log.

### CALCULATED

derived from logs.

### MODELLED / ILLUSTRATIVE

not measured from the person's body.

### EDUCATIONAL

general information.

---

## 0.5 No silent destructive action

Require appropriate confirmation for:

- record deletion;
- restore;
- erase-all;
- bulk import;
- destructive migration;
- supply deletion.

---

## 0.6 Clinical content governance

Create a clinical-content registry covering:

- wording;
- source;
- source date;
- reviewer;
- review date;
- product applicability;
- jurisdiction;
- version.

---

# PACK 1 — DATA MODEL V2 & MIGRATIONS

## 1.1 Versioned persisted schema

**Status: NEW / P0**

Recommended structure:

- schemaVersion
- profile
- doses
- weights
- legacyEffects
- checkIns
- medicationSchedules
- supplies
- reminders
- milestones
- preferences
- notes
- metadata

---

## 1.2 Common metadata

Records should support, where appropriate:

- id
- createdAt
- updatedAt
- source
- importBatchId
- externalIntegrationSource

Source possibilities:

- manual
- csv_import
- backup_restore
- integration
- legacy

---

## 1.3 Legacy EffectEntry protection

Do not rewrite old symptom logs merely to fit the new DailyCheckIn format.

Both must remain readable.

Analytics may normalize them at query time.

---

## 1.4 Deterministic migration system

Implement:

`migratePersistedData()`

Flow:

old data\
→ validate\
→ migrate in memory\
→ validate new result\
→ persist safely

Never overwrite valid old data before migration success.

---

## 1.5 Migration recovery

If migration encounters malformed data:

- retain recoverable records;
- flag skipped/malformed sections;
- provide raw rescue where possible;
- never pretend nothing was lost if something was unreadable.

---

# PACK 2 — BACKUP, RESTORE, IMPORT & EXPORT FOUNDATION

## 2.1 Backup V2

**Status: IMPROVE / P0**

Include:

- schemaVersion
- appVersion
- exportedAt
- profile
- all supported record domains
- metadata

---

## 2.2 Restore preview

Before replacing data show:

- backup date;
- schema version;
- medication(s);
- dose count;
- weight count;
- check-in count;
- supply count;
- date range.

Then require explicit confirmation.

---

## 2.3 Older backup compatibility

Must test:

V1 → V2

and every future supported version.

---

## 2.4 Pre-operation snapshot

Before:

- full restore;
- significant import;
- potentially destructive migration;

create a temporary rollback snapshot where technically feasible.

---

## 2.5 CSV export

**Status: EXISTING / KEEP**

Remain free and self-service.

Do not monetise basic health-data portability.

---

## 2.6 Full-data export

Support:

- CSV
- JSON

Later consider structured healthcare interchange only if useful and standards-compliant.

---

## 2.7 Import wizard

Expand into:

### Step 1
Upload file.

### Step 2
Column mapping and preview.

### Step 3
Confirm.

Display:

- accepted rows;
- duplicates;
- invalid rows;
- future dates;
- unknown medications;
- unit assumptions.

---

## 2.8 Multi-domain import

Future import support:

- weight;
- doses;
- check-ins.

Never silently map unclear medications.

---

# PACK 3 — COMPLETE CRUD & RECORD SAFETY

## 3.1 Dose CRUD

**Status: IMPROVE / P0**

Add:

- create;
- view;
- edit;
- delete;
- delete confirmation;
- undo;
- historical entry.

---

## 3.2 Weight CRUD

Add:

- create;
- view;
- edit;
- delete;
- delete confirmation;
- undo.

---

## 3.3 Symptom/check-in CRUD

Complete:

- create;
- view;
- edit;
- delete;
- history.

---

## 3.4 Duplicate detection

Warn rather than block.

Examples:

### Dose
same medication + similar amount + close timestamp.

### Weight
same date/time + nearly identical value.

### Import
same date/value combination.

---

## 3.5 Provenance

Display source where useful:

- Manual
- Imported
- Restored
- Connected source

---

# PACK 4 — NAVIGATION & INFORMATION ARCHITECTURE

## 4.1 Primary architecture

Recommended main destinations:

### Today

### Progress

### Health

### Medication

### Insights

---

## 4.2 Secondary navigation

Under More:

- Calendar
- All Logs
- Reports
- Guidance
- Tools
- Data / Import / Export
- Settings

---

## 4.3 Mobile persistent navigation

Maximum five:

- Today
- Progress
- Health
- Medication
- More

---

## 4.4 Desktop layout

Use desktop space intentionally.

Possible:

- multi-column dashboard;
- contextual right rail;
- wider charts;
- sticky actions where appropriate.

The GLAPP audit specifically notes the competitor keeps a narrow single-column layout even on wide desktop screens, which is an opportunity for us to improve.

---

# PACK 5 — TODAY / HOME OPERATING SYSTEM

## 5.1 Today header

Display:

- local date;
- medication;
- journey context.

---

## 5.2 Medication status

Show:

- last recorded dose;
- next saved scheduled dose;
- days since last recorded dose;
- upcoming;
- due today;
- overdue;
- no schedule.

Never say:

“Take your medication now.”

Use:

“Your saved schedule shows a dose planned today.”

---

## 5.3 Today's checklist

Possible rows:

- medication;
- weight;
- check-in;
- optional user-selected habits.

States:

- Done
- Not logged
- Skipped
- Not scheduled

---

## 5.4 Quick actions

Primary:

- Log Dose
- Log Weight
- Check In

Secondary:

- Note
- History

---

## 5.5 Progress snapshot

Show:

- current weight;
- total change;
- percent change;
- goal remaining;
- recent trend if meaningful.

---

## 5.6 Latest wellbeing

Show recent:

- hunger;
- food noise;
- nausea;
- energy;
- overall feeling.

Include observation date.

---

## 5.7 Contextual cards

Examples:

- report ready;
- supply low;
- expiry approaching;
- backup reminder;
- check-in not recorded;
- new milestone.

Cards disappear when no longer relevant.

---

# PACK 6 — MEDICATION SCHEDULE

## 6.1 Schedule object

Create real user-defined schedule.

Fields:

- medication;
- start date;
- interval;
- weekdays;
- preferred local time;
- active;
- notes.

---

## 6.2 Schedule modes

Support:

- weekly;
- interval-based;
- fixed weekdays;
- none.

GLAPP supports interval or fixed-weekday scheduling, with a broad user-set frequency range.

---

## 6.3 Schedule is not a prescription

Schedule records what the user says their plan is.

The app must not create a treatment plan from medication reference tables.

---

## 6.4 Changing schedule

Never rewrite historical injections.

---

## 6.5 Schedule states

- upcoming;
- today;
- overdue;
- completed by matching log;
- skipped by user.

---

# PACK 7 — DOSE LOGGING 2.0

The audited competitor uses date/time, medication/dose, site rotation, pain and notes.

Our improved version should include all of these, with safer defaults.

## 7.1 Medication

Prefill the previously confirmed medication when appropriate.

Do not invent first-ever treatment.

---

## 7.2 Dose

Support:

- previous confirmed amount;
- standard reference buttons;
- custom value;
- unusual-value confirmation.

A medication change must reset irrelevant prior selections.

---

## 7.3 Dose colours

Optional custom visual colours.

Always pair colour with text.

---

## 7.4 Date/time

- today;
- historical;
- future blocked;
- convenient time picker.

---

## 7.5 Injection site rotation

Support:

- abdomen zones;
- arms;
- thighs;
- flank;
- user custom sites;
- previous site;
- suggested next site.

---

## 7.6 Site-history visual

Show recent site use.

Do not rank sites by medical efficacy.

---

## 7.7 Discomfort

Support:

- not recorded;
- none;
- mild;
- moderate;
- distressing;
- severe.

Could retain numeric detail internally if useful.

---

## 7.8 Notes

Character-limited notes.

---

## 7.9 Historical shot mode

Explicit:

“Add past dose”

---

# PACK 8 — DAILY CHECK-IN V2

GLAPP's audited daily form includes weight, hunger/food noise/cravings, 21+ symptoms, mood, energy, feelings, bowel, Bristol stool type, sleep and notes.

We should incorporate all useful domains while keeping our default interaction faster.

## 8.1 Quick Check-in

Default:

- Hunger
- Food noise
- Energy
- Nausea
- Overall feeling

---

## 8.2 Weight

Optional from same sheet.

Avoid forcing repeat entry when already logged that day.

---

## 8.3 Appetite

Track:

- Hunger
- Food noise
- Cravings
- Appetite suppression

Use appropriate subjective scales.

---

## 8.4 Gastrointestinal

Include:

- nausea;
- vomiting;
- constipation;
- diarrhoea;
- reflux;
- bloating;
- indigestion;
- abdominal discomfort.

---

## 8.5 General symptoms

Include:

- fatigue;
- headache;
- dizziness;
- dehydration;
- others via custom symptoms.

---

## 8.6 Mood

5-point scale or similarly simple instrument.

---

## 8.7 Energy

5-point scale.

---

## 8.8 Feeling picker

Consider selectable positive/negative feeling vocabulary.

Useful for pattern recognition without excessive free text.

---

## 8.9 Bowel

Track:

- bowel movement;
- effort;
- Bristol type 1–7.

---

## 8.10 Sleep

Track:

- duration;
- quality.

Do not persist a default seven hours unless user explicitly confirms it.

---

## 8.11 Lifestyle — optional

Possible:

- water;
- protein;
- steps;
- exercise;
- movement.

User can disable fields they do not want.

---

## 8.12 Custom symptoms

Add/remove personal symptoms.

Removing from future picker must not delete history.

---

## 8.13 Notes

Free-text reflection.

---

## 8.14 Backfill

User may enter previous days.

Future dates blocked.

---

## 8.15 Severe symptom handling

Show escalation guidance.

Do not diagnose.

---

# PACK 9 — HEALTH & SYMPTOMS CENTER

## 9.1 Rename

Prefer:

**Health & Symptoms**

over merely:

**Side Effects**

because appetite, sleep, mood and energy are broader health measures.

---

## 9.2 Health overview

Show:

- days checked in;
- symptoms recorded;
- severe events;
- appetite;
- mood;
- energy;
- sleep;
- bowel.

---

## 9.3 Symptom timeline

Overlay dose markers.

---

## 9.4 Appetite chart

Show:

- Hunger
- Food noise
- Cravings

---

## 9.5 Mood and energy chart

Dedicated visualization.

---

## 9.6 Feelings trends

Optional pattern view.

---

## 9.7 Day-since-dose patterns

Only after sufficient data.

Clearly label:

“Pattern in your logged data — not proof of medication effect.”

---

## 9.8 Data completeness

For every relevant metric:

“Recorded on X of Y days.”

---

# PACK 10 — WEIGHT & PROGRESS CENTER

## 10.1 Existing functionality

Keep:

- weight logging;
- kg/lb;
- starting weight;
- target weight;
- CSV import;
- trends;
- charts.

---

## 10.2 Optional UK unit

Add:

stone + pounds.

GLAPP exposes Metric, Imperial US and Imperial UK options.

---

## 10.3 Core KPIs

- current;
- total change;
- percent change;
- goal remaining.

---

## 10.4 Rolling trends

- 7-day
- 30-day
- overall

when data is sufficient.

---

## 10.5 Weight graph dose markers

Toggle:

**Show doses / Hide doses**

---

## 10.6 Weight heatmap

Calendar-style visualization.

---

## 10.7 Milestones

Potential:

- 5%;
- 10%;
- user-defined weight;
- consistency milestones;
- anniversaries.

---

## 10.8 Goal forecast

Future only.

Require:

- sufficient longitudinal data;
- uncertainty;
- methodology;
- opt-out.

Never show guaranteed target date.

---

# PACK 11 — ANALYTICS & INSIGHTS

GLAPP's audit identified nine progress-chart concepts including weight, peer comparison, trial context, heatmaps, side effects, appetite, mood/energy, feelings and activity logging.

We should capture all concepts, but risk-rank them.

## 11.1 Common time ranges

Standardize:

- 2 weeks where useful;
- 1 month;
- 3 months;
- 6 months;
- 1 year;
- All.

---

## 11.2 Weight

Recorded trend.

---

## 11.3 Dose timeline

Medication, amount and changes.

---

## 11.4 Weight + dose overlay

Dose markers.

---

## 11.5 Symptoms + dose overlay

Association only.

---

## 11.6 Satiety/appetite analytics

- hunger;
- food noise;
- cravings.

---

## 11.7 Mood / energy

---

## 11.8 Feelings

---

## 11.9 Logging activity heatmap

GitHub-style daily tracking density.

---

## 11.10 Accessible tables

Every important chart has a non-chart equivalent.

---

# PACK 12 — SHOT PHASE / WEEKLY CYCLE

The competitor's signature concept uses phase names, progress, next-phase status and Now/Watch/Do content.

Our current implementation already has an illustrative weekly-phase concept.

Improve carefully.

## 12.1 Phase header

Show:

- phase;
- day/time since logged dose;
- cycle progress;
- next illustrative phase.

---

## 12.2 Show all phases

Expand all phases.

---

## 12.3 Now

Explain what the model represents.

---

## 12.4 Watch

Possible experiences, medically reviewed and carefully caveated.

---

## 12.5 General self-care

Only low-risk reviewed education.

Never medication administration instruction.

---

## 12.6 Overdue state

Avoid language such as “Reset Phase” if it can imply treatment action.

Simply explain the model is beyond the standard illustrated cycle.

---

# PACK 13 — MEDICATION LEVEL MODEL

## 13.1 Current estimated relative level

Retain with strong model disclaimer.

---

## 13.2 Percentage of modelled peak

Allowed only as clearly modelled.

---

## 13.3 Multiple medication history

If users change drugs, show distinct series/events.

---

## 13.4 Average/smoothing toggle

Could offer appropriately explained moving average if analytically justified.

---

## 13.5 Time ranges

- 2 weeks
- 1 month
- 3 months
- All

---

## 13.6 Never call it blood level

It is not a laboratory measurement.

---

# PACK 14 — CALENDAR V2

Display:

- recorded dose;
- planned dose;
- weight;
- check-in;
- report;
- supply warning;
- milestone.

## Day details

Click day:

- all records;
- log dose;
- log weight;
- check in;
- note.

---

# PACK 15 — WEEKLY REPORT RITUAL

GLAPP creates weekly reports with statuses such as Ready, Unread, Incomplete and future-lock dates, and encourages data completeness through a “logs needed” checklist.

We should use that pattern.

## 15.1 Numbered journey reports

Example:

**Week 12 Report**

---

## 15.2 Statuses

- Upcoming
- Ready
- Incomplete
- Viewed
- New

---

## 15.3 Ready-on date

Show when upcoming report becomes available.

---

## 15.4 Logging checklist

Examples:

- Dose 1/1
- Weight 1/1
- Check-ins 4/7

Do not require fabricated entries just to complete a report.

---

## 15.5 Weight report

Include:

- first;
- last;
- change;
- weekly;
- monthly;
- longer-term.

---

## 15.6 Medication report

Include:

- amount recorded;
- medication history;
- dose changes.

---

## 15.7 Symptom report

Include:

- recorded days;
- symptom count;
- severity;
- most frequent.

---

## 15.8 Appetite

- Hunger
- Food noise
- Cravings

---

## 15.9 Mood

- mood;
- energy;
- feelings.

---

## 15.10 Logging grid

Display which days each domain was recorded.

---

## 15.11 Dose-period breakdown

Can show:

- number of days during each recorded dose period;
- weight change within the period.

Must say:

**Association in the logged period, not proof the dose caused the outcome.**

---

## 15.12 Injection-site breakdown

Safe:

- injection count by site.

Do not calculate:

“weight lost per injection site”

as an efficacy conclusion.

---

# PACK 16 — CLINICIAN VIEW & SHARING

## 16.1 Clinician report

Create a plain medical-review layout.

Include:

- date range;
- medication;
- dose history;
- weight trajectory;
- severe symptom events;
- appetite;
- check-in completeness;
- relevant notes.

---

## 16.2 Remove non-clinical clutter

No:

- gamification;
- ads;
- referral banners;
- premium teaser graphics.

---

## 16.3 Output

- Print
- Save as PDF
- CSV
- JSON

---

## 16.4 Secure share link

Future only after secure cloud architecture exists.

---

# PACK 17 — SUPPLY / INVENTORY

GLAPP tracks both vials and pens with expiry, status and extensive metadata.

We should capture this comprehensively.

## 17.1 Supply item common fields

- medication;
- product/brand;
- presentation;
- quantity;
- expiry;
- status;
- received date;
- provider;
- pharmacy;
- lot;
- cost;
- notes.

---

## 17.2 Vial

Fields:

- concentration text;
- concentration units;
- vial volume;
- quantity;
- optional blend;
- expiry;
- status.

These describe the supply.

They must not automatically instruct the user how much to inject.

---

## 17.3 Pen

Fields:

- single-dose/multi-dose;
- labelled strength;
- quantity;
- expiry;
- status.

---

## 17.4 Status

- Sealed
- Open
- Finished
- Empty
- Discarded

---

## 17.5 Expiry reminders

---

## 17.6 Low-stock reminders

---

## 17.7 Run-out estimate

Clearly disclose assumptions.

---

## 17.8 Dose-to-supply mapping

After logging:

“Use this from [item]?”

User confirms.

No automatic silent deduction.

---

## 17.9 Cost tracking

Optional:

- purchase cost;
- currency;
- total supply cost.

---

# PACK 18 — OCR / LABEL AUTOFILL

**Status: FUTURE**

GLAPP offers “Autofill from label” in inventory.

OCR may suggest:

- medication/product;
- strength text;
- expiry;
- lot;
- quantity.

Every value requires confirmation.

Never derive a recommended treatment dose from OCR.

---

# PACK 19 — REMINDERS & NOTIFICATIONS

The audited competitor exposes email reminders for reports, injections, daily check-ins and supply.

Our system should eventually support more than email.

## Reminder types

- dose schedule;
- daily check-in;
- weigh-in;
- weekly report;
- low supply;
- expiry;
- backup.

## Channels

### P0/P1
In-app.

### P1
Browser notification where supported.

### Future
Email/mobile push after account/native infrastructure.

## Controls

- enabled;
- time;
- lead time;
- snooze;
- dismiss.

Permission must be requested only after user action.

---

# PACK 20 — SETTINGS & CUSTOMISATION

## Profile

- medication;
- start date;
- height;
- units.

---

## Units

- Metric
- Imperial US
- Imperial UK

---

## Goals

- starting weight;
- target;
- user-defined goals.

---

## Medication schedule

---

## Check-in preferences

User can show/hide optional fields.

---

## Custom doses

Allow user-entered doses.

---

## Dose colours

Optional.

---

## Custom symptoms

Remove from future picker without altering history.

---

## Injection sites

Enable/disable specific sites.

---

## Report day

User preference.

---

## Reminder preferences

---

## Appearance

Future:

- system;
- light;
- dark.

---

## Accessibility

- reduced motion;
- chart simplification;
- larger UI where useful.

---

# PACK 21 — MILESTONES & GOALS

GLAPP uses milestones as part of the paid insight layer.

Our backlog should include:

## Weight milestones

- 5%
- 10%
- custom

## Journey milestones

- first week
- one month
- anniversaries

## Logging milestones

- first check-in
- consistency milestones

## Optional culturally specific milestone concepts

Avoid potentially unhealthy gamification.

---

# PACK 22 — PREDICTIONS

**Status: FUTURE / REQUIRES METHODOLOGY**

Potential:

- trend forecast;
- target range timing;
- supply run-out;
- next report date.

Rules:

- transparent methodology;
- uncertainty;
- sufficient-data threshold;
- no guarantee;
- user can hide.

---

# PACK 23 — PEER COMPARISON

**Status: HOLD UNTIL DATA EXISTS**

GLAPP has weight-vs-peers comparison.

We should not fabricate this.

Requires:

- real representative dataset;
- cohort definitions;
- privacy minimums;
- sample size disclosure;
- statistical review.

---

# PACK 24 — CLINICAL TRIAL CONTEXT

GLAPP overlays published trial curves such as STEP/SURMOUNT-style benchmarks.

Possible future feature.

Display:

**Published study average, not a personal prediction.**

Requirements:

- correct population;
- treatment;
- dose;
- duration;
- source;
- trial limitations.

---

# PACK 25 — GUIDANCE / EDUCATION

## Core topics

- how to use the tracker;
- injection-site rotation;
- weight fluctuations;
- hydration;
- protein;
- fibre;
- exercise;
- common symptoms;
- preparing for medical appointments;
- how modelled medication-level charts work;
- how predictions work;
- privacy.

---

## Content metadata

Each health-related item includes:

- references;
- review date;
- version;
- medical review status.

---

## Phase-linked guidance

Can surface education relevant to the user's current recorded phase.

Do not create personalised treatment instructions.

---

# PACK 26 — SCIENCE & EVIDENCE CENTER

GLAPP publicly surfaces pharmacology/trial references and an evidence-standards layer.

We should create our own:

### Evidence standards

Explain:

- preferred source hierarchy;
- clinical-label vs trial data;
- observational evidence;
- modelling limitations.

### Sources

Prioritize:

- regulators;
- product labels;
- peer-reviewed trials;
- clinical guidelines;
- professional societies.

### Change history

Important medical-content updates should be versioned.

---

# PACK 27 — INDIA LOCALISATION

The second audit explicitly identifies India-specific context as a differentiation opportunity.

Include:

- kg-first;
- ₹;
- Indian date conventions where useful;
- local product/brand context;
- local vial/pen availability;
- pharmacy/provider fields;
- local health-system terminology;
- appropriate emergency/help wording.

Medication availability must be maintained from current verified sources.

---

# PACK 28 — PWA & OFFLINE

## Installable PWA

- manifest;
- icons;
- service worker.

## Offline shell

Previously loaded app opens offline.

## Offline logging

Allow:

- Dose
- Weight
- Check-in

without network.

## Safe application update

Do not strand locally stored data during service-worker upgrade.

---

# PACK 29 — PERFORMANCE

GLAPP audit observed slow first opening of logs with several seconds of skeleton loading.

Our targets:

- lightweight Today;
- route code splitting;
- lazy analytics;
- lazy OCR;
- lazy AI;
- efficient timeline;
- no unnecessary chart loads;
- no remote font dependency.

---

# PACK 30 — ACCESSIBILITY

Required across all packs.

## Keyboard

Full interaction.

## Screen readers

Proper roles, labels and announcements.

## Focus

Visible and logical.

## Touch

Approximately 44px targets.

## Zoom

Support 200%.

## Contrast

Pass existing contrast testing.

## Reduced motion

Respect system preference.

## Charts

No colour-only encoding.

Accessible table/text equivalent.

---

# PACK 31 — ERROR, EMPTY & RECOVERY STATES

Every feature needs explicit states.

## Empty

Examples:

- No doses
- No weights
- No check-ins
- No supply
- Not enough analytics data

## Error

Examples:

- storage unavailable;
- backup invalid;
- import malformed;
- notification unsupported;
- OCR failed;
- AI unavailable.

## Recovery

Always explain what remains safe.

Never generate plausible synthetic health data as fallback.

---

# PACK 32 — PRIVACY & HEALTH-DATA CONTROLS

## Current local-only mode

Explain clearly:

- where data lives;
- that browser storage can be lost;
- whether data is encrypted;
- export options;
- deletion behavior.

---

## No hidden analytics

Do not introduce third-party tracking unnoticed.

---

## Privacy policy

Add dedicated:

**Health Data Privacy**

page.

The audited competitor does this explicitly.

---

## Consent

Store meaningful consent/version records when necessary.

---

## Selective deletion

Future:

- individual record;
- category;
- entire local dataset.

---

# PACK 33 — SECURITY

## Current static/local app

Maintain:

- strict CSP;
- no unnecessary third-party scripts;
- no remote executable dependencies at runtime;
- secure headers;
- dependency audit.

## Local privacy lock

Evaluate device/browser-appropriate lock.

Do not describe simple obfuscation as encryption.

## Future cloud

Requires:

- authentication;
- MFA options where appropriate;
- encryption in transit;
- encryption at rest;
- row-level authorization;
- least privilege;
- audit logs;
- secret management;
- backups;
- abuse protection;
- account recovery;
- deletion;
- export.

This requires a separate architecture review before cloud sync is introduced.

---

# PACK 34 — LEGAL / COMPLIANCE RELEASE REVIEW

Separate from medical quality.

Before large-scale launch review:

- Privacy Policy
- Terms
- health-data language
- cookie/analytics behavior
- age requirements
- consent
- marketing email compliance
- subscription disclosures if monetised
- user-upload/content issues where applicable
- jurisdictional requirements

No legal checklist should be represented as legal advice without qualified review.

---

# PACK 35 — PUBLIC TOOLS HUB

The audited product uses a large free `/tools` catalogue as acquisition and SEO infrastructure.

Create a future:

**GLP Tools**

section.

Every tool page should contain:

- calculator/interface;
- explanation;
- FAQ;
- methodology;
- sources;
- disclaimer;
- appropriate safety notice;
- CTA into GLP Companion.

---

# PACK 36 — LOW / MODERATE-RISK PUBLIC CALCULATORS

Candidates for independent evaluation:

## Weight change calculator

## Percentage change calculator

## BMI/context calculator

## Goal-progress calculator

## Protein planning

GLAPP's protein calculator factors body size, GLP-1 phase, strength training and meals, with a kidney-disease caution.

We should create our own clinically reviewed methodology rather than copy theirs.

## Water planning

## Fibre education

## Cost tracking

## Medication timeline visualizer

## Simple unit conversions

## Weight trend visualizer

Every health recommendation calculator requires reviewed assumptions.

---

# PACK 37 — GOAL TIMELINE TOOL

**Status: REVIEW / FUTURE**

Competitor uses trial-derived estimates.

If ever implemented:

- show assumptions;
- study basis;
- uncertainty;
- no guarantee;
- never call it expected personal outcome.

---

# PACK 38 — MEDICATION / PK PLOTTER

Potentially useful for educational visualization.

Inputs could include:

- medication;
- user-recorded dates;
- user-recorded dose.

Output:

illustrative model only.

Do not turn model output into dose advice.

---

# PACK 39 — COST ANALYTICS

Potential:

- monthly medication spend;
- cumulative spend;
- optional cost per period.

Be cautious with:

“cost per kg lost”

because it can distort health decisions.

If shown, present as simple historical arithmetic, not value judgement.

---

# PACK 40 — HIGH-RISK CALCULATOR SAFETY HOLD

The audit records numerous tools that directly affect medication administration.

All belong in the master backlog so they are not forgotten, but **not in ordinary implementation**.

## 40.1 Dose-to-syringe-unit calculator

### HOLD

---

## 40.2 Reverse syringe-unit-to-dose calculator

### HOLD

---

## 40.3 Zepbound/vial reverse calculation

### HOLD

---

## 40.4 Peptide mixing/reconstitution calculator

### HOLD

---

## 40.5 Split-dose planner

### HOLD

---

## 40.6 Vial-transition calculator

### HOLD

---

## 40.7 Mounjaro pen-click calculator

### HOLD

---

## 40.8 Zepbound pen-click calculator

### HOLD

---

## 40.9 Golden-dose/partial-pen calculations

### HOLD

---

## 40.10 Titration planner

### HOLD

---

## 40.11 Medication-specific missed-dose take-now/skip tool

### HOLD

---

These require separate:

- clinical assessment;
- jurisdiction analysis;
- product liability review;
- up-to-date label validation;
- explicit decision whether our product should provide such functionality at all.

They must not enter implementation simply for competitor parity.

---

# PACK 41 — DOSAGE CHART CONTENT

The audited competitor has four linked dosage-chart destinations that were broken on its own site.

Possible future opportunity:

create **working reference pages** if appropriate.

But these should contain:

- label-derived reference information;
- exact product identification;
- jurisdiction/date;
- source;
- prominent statement that users must follow their own prescription.

They should not generate personalised dosing plans.

---

# PACK 42 — AI “ASK MY DATA”

**Status: P2 / FUTURE**

Potential questions:

- What changed this month?
- Which symptoms have I recorded most?
- What happened after my recent injections?
- Summarise this for my doctor.
- How consistent have my check-ins been?

Every answer separates:

## From your data

## General information

## What cannot be concluded

Show exactly what records were used.

---

# PACK 43 — AI KNOWLEDGE / WISDOM

Separate from “Ask My Data.”

Can answer general GLP questions using reviewed authoritative sources.

Requirements:

- citations;
- retrieval date;
- uncertainty;
- no dosing instructions;
- escalation for urgent symptoms.

GLAPP has a Wisdom area combining studies/community content.

We should prioritise authoritative evidence over community anecdotes for medical claims.

---

# PACK 44 — HEALTH PLATFORM INTEGRATIONS

Future:

- Apple Health
- Health Connect
- possibly wearables

Potential imports:

- weight;
- activity;
- sleep.

Every connected data point must retain source.

User controls each integration.

---

# PACK 45 — NATIVE MOBILE APPS

GLAPP has iOS and Android apps, although the supplied audit did not inspect their native flows.

Our roadmap may eventually include:

- installable PWA first;
- native wrapper/app only if user traction justifies it.

Potential native advantages:

- reliable push;
- biometrics;
- health integrations;
- better offline behavior.

---

# PACK 46 — CLOUD ACCOUNT / SYNC

**Status: FUTURE MAJOR PROJECT**

Possible benefits:

- multi-device;
- secure clinician sharing;
- email reminders;
- secure backup.

But introduces substantially greater health-data responsibility.

Requires separate architecture and privacy approval.

---

# PACK 47 — TRUST CONTENT

Future public trust layer:

- Science
- Evidence standards
- Privacy
- Health data privacy
- Support
- FAQs
- Change log

---

# PACK 48 — BLOG / CONTENT ENGINE

GLAPP also uses blog/review content around its product.

Potential content themes:

- GLP tracking
- habit support
- weight data
- nutrition
- symptom logging
- appointment preparation
- evidence explanations

Every health claim needs sources.

---

# PACK 49 — REVIEWS / SOCIAL PROOF

Use only genuine verifiable reviews.

Potential sources:

- app stores;
- permitted customer reviews;
- testimonials with consent.

Never fabricate review counts or success outcomes.

---

# PACK 50 — MONETISATION

The audited competitor keeps core tracking free and places many deeper insight layers behind Max.

Possible model:

## Always free

- basic logging;
- personal history;
- core analytics;
- export;
- backup;
- privacy controls;
- safety information.

## Possible premium

- deep longitudinal insights;
- advanced reports;
- AI;
- integrations;
- advanced planning;
- optional secure sync.

Do not paywall basic access to the user's own health records.

---

# PACK 51 — PREMIUM TEASERS

Could use blurred/locked previews for optional advanced analytics.

Rules:

- no safety information behind paywall;
- no basic export behind paywall;
- no manipulative claim that critical medical information is hidden unless user pays.

---

# PACK 52 — PRICING EXPERIMENTATION

Competitor pricing is useful only as a benchmark, not something to copy directly. It currently presents weekly/monthly/yearly Max plans according to the audit.

Our pricing should be tested based on:

- India;
- international markets;
- actual feature value;
- operating cost;
- willingness to pay.

---

# PACK 53 — REFERRAL PROGRAM

Future after monetisation.

Possible:

- referral code;
- referred user reward;
- referrer reward;
- conversion status;
- reward history;
- clear eligibility terms.

The audited GLAPP referral loop rewards both parties in connection with Max.

---

# PACK 54 — PUBLIC TOOLS → APP HANDOFF

Strong acquisition pattern:

calculator result\
→ “Save to GLP Companion”

Use only where saving is clinically safe.

Examples:

- weight result;
- protein goal preference;
- hydration preference;
- tracking target.

Never save a medication-administration calculation directly as an instruction.

---

# PACK 55 — SEO ARCHITECTURE

Every public tool page should support:

- unique title;
- strong explanatory copy;
- FAQ;
- structured data where appropriate;
- source section;
- medical disclaimer;
- internal linking;
- app CTA.

---

# PACK 56 — PRODUCT COMPARISON / POSITIONING

Do not become a literal Shotsy/GLAPP clone.

Potential positioning:

**More transparent data.\
Better clinician sharing.\
India-aware.\
Privacy-first.\
Evidence visible.\
Safer advanced features.**

---

# PACK 57 — RELEASE QUALITY GATES

Before major releases run:

- clean install
- TypeScript
- test suite
- multiple timezones
- production build
- dependency audit
- contrast
- diff check

At minimum test:

- Asia/Kolkata
- UTC
- America/New_York

---

# PACK 58 — REAL-BROWSER ACCEPTANCE

Desktop and mobile.

Test:

## Onboarding

## Today

## Dose
- add
- edit
- delete
- historical
- duplicate

## Weight
- add
- edit
- delete
- import

## Check-in
- quick
- expanded
- edit
- delete

## Schedule

## History

## Calendar

## Reports

## Supply

## Reminders

## Backup

## Restore

## Offline

---

# PACK 59 — DATA-INTEGRITY REGRESSION SUITE

Never regress previous fixes.

Continue testing:

- malformed storage;
- unreadable storage;
- future imported date;
- medication identity in symptom comparisons;
- same-day aggregation;
- absent symptom values;
- reference-dose warnings;
- unmodelled/investigational medications;
- timezone edge cases.

---

# PACK 60 — SECURITY RELEASE TESTING

Before meaningful scale:

- CSP;
- dependency vulnerabilities;
- unintended network requests;
- storage behavior;
- exposed secrets;
- service-worker caching;
- upload handling;
- OCR uploads;
- AI data flow;
- account authorization if cloud is added.

---

# COMPLETE IMPLEMENTATION ORDER

All packs stay in the master backlog.

Execution can still be staged.

## WAVE 1 — Foundation

Packs:

0–3

---

## WAVE 2 — Core daily product

Packs:

4–8

---

## WAVE 3 — Progress & insights

Packs:

9–13

---

## WAVE 4 — Review & reporting

Packs:

14–16

---

## WAVE 5 — Planning

Packs:

17–20

---

## WAVE 6 — Advanced progress

Packs:

21–24

---

## WAVE 7 — Trust & localisation

Packs:

25–27

---

## WAVE 8 — Platform quality

Packs:

28–34

---

## WAVE 9 — Public tools

Packs:

35–41

with Pack 40 remaining on Safety Hold unless separately approved.

---

## WAVE 10 — Intelligence & ecosystem

Packs:

42–46

---

## WAVE 11 — Growth & monetisation

Packs:

47–56

---

## WAVE 12 — Continuous quality

Packs:

57–60

These continue throughout all waves.

---

# FEATURES FROM THE GLAPP AUDIT THAT ARE NOW EXPLICITLY CAPTURED

Nothing below should disappear from the master list:

- dashboard status tiles;
- medication-level estimate;
- weight change;
- weekly average trend;
- milestones;
- predictions;
- shot-phase system;
- phase progress;
- phase education;
- dose markers;
- weight charts;
- trial context;
- peer context;
- weight heatmap;
- symptom timeline;
- appetite charts;
- mood/energy;
- feelings;
- logging heatmap;
- shot logging;
- custom doses;
- dose colours;
- site rotation;
- discomfort;
- notes;
- daily check-in;
- hunger;
- food noise;
- cravings;
- broad symptom list;
- custom symptoms;
- mood;
- energy;
- feelings;
- bowel effort;
- Bristol scale;
- sleep quality;
- sleep duration;
- report archive;
- report readiness;
- data-completeness checklist;
- weight report;
- medication report;
- symptom report;
- dose-period breakdown;
- site breakdown where safe;
- print;
- clinician view;
- vial inventory;
- pen inventory;
- expiry;
- supply status;
- provider;
- pharmacy;
- lot;
- cost;
- OCR;
- metric / imperial US / UK;
- fixed weekdays;
- interval schedules;
- custom sites;
- custom symptoms;
- custom dose appearance;
- report-day preference;
- prediction preferences;
- reminders;
- import;
- export;
- public tools;
- science/evidence;
- privacy;
- health-data privacy;
- AI;
- native apps;
- integrations;
- premium insights;
- referrals;
- SEO;
- content;
- reviews;
- India localisation;
- PWA;
- offline operation.

---

# SAFETY-HOLD FEATURES THAT ARE ALSO RETAINED IN THE MASTER LIST

They are not forgotten.

They are deliberately quarantined:

- syringe-unit calculation;
- reverse dose calculation;
- vial transition calculation;
- peptide mixing/reconstitution;
- split-dose planner;
- pen-click calculation;
- Golden Dose/partial-pen logic;
- titration planner;
- medication-specific missed-dose take/skip decision;
- research-drug dosing tools;
- unsafe personal prediction;
- unsupported peer comparison;
- injection-site efficacy inference.

Their presence in the backlog means:

**review later**

not:

**build automatically**.

---

# FINAL PRODUCT TARGET

The eventual product can cover the entire ecosystem:

### TRACKER
Daily medication, weight and health tracking.

### INSIGHTS
Connected longitudinal understanding.

### PLANNING
Schedule, reminders and supply.

### REPORTING
User and clinician-ready reports.

### SAFETY
Clear limits, escalation and medical-content governance.

### DATA
Backup, portability and privacy.

### TOOLS
Useful public calculators.

### EVIDENCE
Science and source transparency.

### AI
Personal data summaries plus evidence-backed Q&A.

### LOCALISATION
India-first capabilities with international support.

### PLATFORM
Web/PWA first, integrations/native/cloud later.

### BUSINESS
Free core, premium advanced insights if desired.

### GROWTH
SEO tools, content and referral loops.

The objective is no longer simply to “match GLAPP.”

The target is:

**GLAPP breadth\
+ stronger data integrity\
+ better privacy\
+ better clinician utility\
+ stronger desktop UX\
+ India localisation\
+ safer medication boundaries\
+ better portability\
+ a scalable public tools and content engine.**

That is the complete product roadmap.
