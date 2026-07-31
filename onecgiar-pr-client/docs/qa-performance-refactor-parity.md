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
| 5 | IPSR › Contributors — **frozen tab** | A full change detection pass never returned. Root cause: `pr-multi-select.optionsIntance()` rebuilt its option clones on array *identity*, and several consumers bind `[options]` to a method call, so the clones were recreated every pass, the `*ngFor` recreated its views and Angular 21's `synchronize()` loop never settled. Captured with `Debugger.pause`: 84-frame stack, `optionsIntance` on top, `tickImpl → synchronize` at the bottom. | Compare option **content** instead of identity (`685d2b6a0`). Protects all 77 consumers. |
| 6 | IPSR › Contributors — missing textarea | "Progress narrative of the Outcome" never appeared: `indicatorView` is flipped inside a `setTimeout`. | Made it a **signal**, which notifies the scheduler on its own (`685d2b6a0`) |
| 7 | Numeric fields lost thousands grouping | `123123` where prtest reads `123,123` — staging used `<p-inputNumber>`, the Spartan migration left a bare `<input type="number">`. 64 consumers. | `numberRaw` display value mirroring the currency field, model updated on every keystroke, input sanitised to what `p-inputNumber` accepted (`b773ddde7`) |
| 8 | `/ipsr/list` empty | "Submitter (s)" filter had no chips and the table said "There are no results for the selected filters". `app-header-panel.ngOnInit` was where the app loaded roles, initiatives, notification counters and phases; the sidebar replaced that header and nothing took the bootstrap over. Admins were hit hardest (`innovation-package-list` only calls `updateUserData()` on the non-admin branch). | Bootstrap moved into `AppComponent`; repaint un-scoped now that the loop is gone (`a1ab2c67e`) |
| 9 | `innovation-dev-info` runtime error | `Cannot read properties of undefined (reading 'question_text')` — the API omits questions that do not apply to a result's version (result 51 has no `q4`) and the template read them unconditionally. Present on prtest too. | Normalise the payload against the model in the input setter (`ac411f6de`) |
| 10 | AOW › Angular scaffold text reaching users | `/entity-details/:id/aow` redirects to `all`, whose template shipped `<p>entity-aow-all works!</p>`. Same for `unplanned`. | Templates emptied; the missing view is reported below rather than invented |

### Open — needs a decision

| # | Area | Symptom | Notes |
|---|---|---|---|
| A | AOW › "Intermediate Outcomes" view | prtest renders a full table at `/entity-details/SP01/aow/unplanned` (KPI statement, indicator typology, target, achieved value, status, **Report result / View results**) and links it from the Indicators sidebar. On this branch `entity-aow-all` and `entity-aow-unplanned` are **unimplemented scaffolds** and the sidebar has no "Intermediate Outcomes" entry. `AOW01…AOW05` and `2030-outcomes` do have parity. | This is unfinished branch work, not a bug to patch — the view has to be built or the routes removed. It is the one item that blocks "works exactly as before" for the RFR reporting flow. |
| B | Design line — mandatory colours | `field-card` (Mandatory/Optional tag + state colours) is only used by `pr-input`, `pr-textarea`, `pr-radio-button`, `lead-contact-person-field`. Missing on `pr-select` (110 uses), `pr-multi-select` (77), `pr-yes-or-not` (23), `pr-range-level` (7) — 217 usages. | Visual change across the whole app; needs a design decision, not a QA fix. |
| C | `/bilateral` | `GET /api/bilateral/center/projects?centerId=CENTER-01` answers **404** on prtest-back, so the page cannot load. The route does not exist on prtest at all (it redirects to home). | New feature whose backend is not deployed on this environment. Frontend-only scope, nothing to fix here. |

### Pre-existing, identical on prtest (not branch regressions)

- `GET /api/results/get/all` answers **500** — SQL syntax error in the backend.
- `GET /api/results-framework-reporting/get/science-programs/progress` answered **500**
  (`ECONNREFUSED …:3306`) for a while during the run; it recovered on its own.
- `NG0100` in `AppComponent`, from an expression unchanged since staging (dev-mode only).
- **Result Detail › General information silently refuses to save** when a Lead contact person is
  loaded but not re-picked: `onSaveSection()` returns early on
  `searchQuery && !selectedUser && !isP25`, with no message to the user. Reproduced identically on
  prtest, so out of scope here — but worth a ticket.
- Cypress CT: 4 failures in `pr-input.contract.cy.ts` and 1 in `pr-multi-select.cy.ts` predate this
  pass (verified against `HEAD~1`). They are harness artefacts of the same zoneless gap —
  `patchHost` mutates a plain property and relies on `autoDetectChanges`, which no longer schedules a
  pass. `pr-input.contract` went from 5 failures to 4 during this work.

## Verified equivalent to prtest

- **Result Detail, every section, on all six editable result types** — Policy change (554),
  Knowledge product (11), Innovation development (51), Capacity sharing (224), Other output (259),
  Innovation use (993): same field count, same labels, same values, same green checks, and no
  stale render on any of them.
- **IPSR detail, every section** — General information, Contributors, Link to results and Innovation
  use pathway steps 1–5 on package 4509.
- **Save round-trips** (change → Save → reload → value persisted → restored):
  - Result Detail › Capacity sharing info (`PATCH 201 results/summary/capacity-developent/...`)
  - Result Detail › Innovation development info (`PATCH 201 results/summary/innovation-dev/...`)
  - Result Detail › General information on a fresh result (`PATCH 200 results/create/general-information`)
  - IPSR › Innovation use pathway Step 1 (`PATCH 200 ipsr/innovation-pathway/save/step-one/...`)
- **Full result lifecycle**: created a result through the wizard (`POST 201 results/create/header` →
  code 8708), walked its sections, saved a field, and deleted it again from the results list
  (`DELETE 200 manage-data/result/.../delete`). The environment was left clean.
- **Result creation wizard**: program dropdown (13 selectable entries), Output level, the four
  indicator categories, title field with word counter and the duplicate-title check.
- **Navigation**: Results Framework & Reporting home, entity details, `aow/AOW01`,
  `aow/2030-outcomes`, `results-review`, results list, IPSR list, notifications, Quality Assurance.
  No route leaves the tab unresponsive.

## Gate

`ng lint` clean · **5191 Jest tests / 418 suites green** after every commit.

Cypress CT was run for the two `custom-fields` components touched (`pr-input`, `pr-multi-select`);
see the pre-existing-failures note above for the baseline.
