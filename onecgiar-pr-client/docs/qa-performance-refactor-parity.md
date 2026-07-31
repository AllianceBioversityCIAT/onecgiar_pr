# QA — `performance-refactor` vs prtest: functional parity of the reporting forms

Living log of the parity pass run before promoting `performance-refactor` to `dev`. The goal is
narrow and explicit: **the forms must behave exactly as they do on prtest** — data loads, data
saves, green checks and mandatory-field signalling all match. The redesign itself is out of scope.

## How the comparison is run

Both environments are driven with Playwright against the **same backend** (`prtest-back`), so a
difference is always a frontend difference:

| | URL |
|---|---|
| Branch under test | `http://localhost:4200` (`ng serve`) |
| Reference | `https://prtest.ciat.cgiar.org` |

Authentication skips the login form: `token`, `user` and `roles` are seeded into `localStorage` via
`addInitScript` before the first navigation (token from `USER_TOKEN`, roles from
`/auth/role-by-user/get/user/2`). The same admin session is therefore used on both sides.

Harness scripts (session scratchpad, not committed):

- `compare.mjs` — field inventory of one route in both environments, diffed by label, control type,
  required flag and current value.
- `stale.mjs` — **stale-render detector.** Snapshots the DOM, forces one pass with
  `ng.applyChanges`, snapshots again. Any difference means the view was rendering data it had
  already received.
- `hang.mjs` — checks whether a route leaves the main thread unresponsive.
- `probe.mjs` / `state.mjs` — API calls made by a route, and live component state via `window.ng`.
- `creator.mjs` — walks the result-creation wizard step by step.

Requests must be **sequential**: hitting `prtest-back` from two browser contexts at once trips a
WAF that answers with CORS failures, which looks exactly like a frontend bug.

## Root cause behind most of the findings

The Angular 19 → 21 upgrade left the app bootstrapping **zoneless**. `provideZoneChangeDetection()`
is never provided, so `NgZone` resolves to `NoopNgZone` (verified at runtime:
`NgZone.isInAngularZone() === false`, `Zone.current.name === '<root>'`) even though `zone.js` is
still bundled in `polyfills.ts`. Nothing in the repo documents this as a decision.

Consequence: finishing an XHR or a `setTimeout` no longer schedules change detection. Any component
that stores its payload in plain — non-signal — fields keeps painting the view it was created with.
The data is fetched correctly and never shown.

Re-enabling zone-based change detection was tried and **rejected**: with
`provideZoneChangeDetection()` the app freezes, reviving the infinite CD loop already described in
`refactor-angular21-spartan-migration.md`.

## Findings

### Fixed

| # | Area | Symptom | Fix |
|---|---|---|---|
| 1 | Result Detail › Geographic location | Saved geoscope, regions and countries never rendered; card stayed orange "Mandatory". prtest showed Regional + Middle Africa + Eastern Africa. | `markForCheck()` after the payload lands (`0e763f9bb`) |
| 2 | Result Detail › Contributors & partners (P25) | Section rendered **0 fields**. | `ViewRefreshService` + repaint on request settle (`e89c4f2f8`) |
| 3 | Result Detail › Lead center | Select never appeared — a `setTimeout` cleared `updatingLeadData` without a render pass. | Repaint after the timeout (`e89c4f2f8`) |
| 4 | IPSR detail (all sections past General information) | Empty shell (~750 chars) where prtest rendered the full form. Step 1 went from 0 to 18 fields. | Repaint extended to `/ipsr/detail/` (`af9417f92`) |

### Open

| # | Area | Symptom | Notes |
|---|---|---|---|
| 5 | IPSR › Contributors | Renders empty. A full change detection pass over the page never returns. | Excluded from the repaint so it degrades instead of freezing the tab. Works on prtest (8 fields). Under investigation. |
| 6 | Design line — mandatory colours | `field-card` (Mandatory/Optional tag + state colours) is only used by `pr-input`, `pr-textarea`, `pr-radio-button`, `lead-contact-person-field`. Missing on `pr-select` (110 uses), `pr-multi-select` (77), `pr-yes-or-not` (23), `pr-range-level` (7). | Visual change across the whole app — needs a design decision, not a QA fix. |

### Pre-existing, identical on prtest (not branch regressions)

- `innovation-dev-info`: `Cannot read properties of undefined (reading 'question_text')` in
  `IntellectualPropertyRightsComponent`.
- `GET /api/results/get/all` answers **500** — SQL syntax error in the backend.
- `NG0100` in `AppComponent`, from an expression unchanged since staging (dev-mode only).

## Verified equivalent to prtest

- Result Detail, all sections, on Policy change (554), Knowledge product (11),
  Innovation development (51), Capacity sharing (224), Other output (259): same field count, same
  labels, same values, same green checks.
- Result creation wizard: program dropdown (13 selectable entries), Output level, the four indicator
  categories, title field with word counter and the duplicate-title check.
- Results Framework & Reporting home.

## Gate

`ng lint` clean · **5191 Jest tests / 418 suites green**.
