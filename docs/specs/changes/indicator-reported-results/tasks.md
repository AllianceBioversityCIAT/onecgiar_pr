# Tasks — Indicator "Reported results" table (`changes/indicator-reported-results`)

**Answer first:** five tasks, strictly serial. `T-1` server param + field; `T-2` drawer tab shell, data and host wiring; `T-3` the table, strip and row actions; `T-4` width floor + card fallback with a Cypress CT gate; `T-5` docs + live SP01 check. One PR. Cut point after T-3 (feature usable).

## 0. Document Control & execution limits

| Field | Value |
|---|---|
| Linked spec | `requirements.md` · `design.md` (same folder) |
| Approval Mode | `pre-approved` (inherited) — Phase 3 gate: *auto-approved (pre-approved mode)* |
| Judgment-day | one pass, fixes applied, no re-judge — see §9 |
| Budget tripwire | 5 tasks · ≈ 320 src + ≈ 450 test LOC (trip at > 1 000 total) · ≤ 1 Reviewer round per task |
| Verification default | server: `npx jest <path> --silent` from `onecgiar-pr-server/`; client: `npx jest <path> --silent` from `onecgiar-pr-client/`; lint `npx ng lint --quiet`; **never** the whole client suite. CT: `CT_DEV_SERVER_PORT=8090 npx cypress run --component --spec <file.cy.ts>` (~1–2 min; two known non-blocking errors: primeicons font, `ct-utils.ts` TS2322) |
| Progress reporting | plain-language line at every task boundary; **offer the cut after T-3** (T-4 is polish behind a CT gate, T-5 docs) |
| Skills | `nestjs-expert` + `tdd` (T-1); `angular-developer` + `tdd` (T-2); `angular-developer` + `ui-ux-pro-max` (T-3); `angular-developer` (T-4); `orca-cli` (T-5) |
| Concurrency | one session per checkout (`KZ-MRF-3`); explicit-pathspec diffs and commits; `dashboard-lab.component.ts` gets one changed line plus the type union |
| Branch / commit | `qa-development-2026`; `✨ feat(indicator-drawer) [SPEC:changes/indicator-reported-results]: …` |

## 1. Scope of this task list
- **Module / feature:** `result-framework-reporting` / indicator drawer *Reported results* tab.
- **Status:** `in-progress` (execution started 2026-09-03).

## 2. Pre-flight checklist
- ✅ `requirements.md` approved (auto-approved, pre-approved mode).
- ✅ `design.md` approved (auto-approved, pre-approved mode).
- ✅ Open questions resolved (proposal OQ-1 → IRR-R-3 / IRR-DD-2; OQ-2 → IRR-R-2.2 / IRR-DD-3).
- ✅ No in-flight spec editing `indicator-drawer/*` (checked 2026-09-03 at execution start).
- ✅ No migration, no CLARISA dependency.

## 3. Task list

### `IRR-T-1` — Server: `scope` param and `result_type_name` on `existing-result-contributors` `[x]`
- **Type:** `server` + `tests`
- **Description:** Add optional `scope` (`reviewed` default | `all`) to the controller (`@Query`, Swagger enum), service and `GetExistingResultContributorsToIndicatorsQuery`; the handler normalises anything but `'all'` to `'reviewed'`. Loader picks the status set by scope (`reviewed` = today's literal `[QualityAssessed, Approved]`; `all` = the explicit list `[Editing, QualityAssessed, Submitted, PendingReview, Approved]` — `Discontinued`, `Rejected`, `Draft` excluded) and adds `obj_result_type: { id, name }` to relations/select. Mapper emits `result_type_id`, `result_type_name` (null-safe); types updated. Design §4.1, §5, IRR-DD-2, IRR-DD-3.
- **Implements:** `IRR-R-2.2` (server half), `IRR-R-3` (filter), `IRR-R-3.1`, `IRR-AC-3`; scenario *Endpoint default unchanged* (all clauses); *The table shows the pipeline* → `AND IT MUST omit Discontinued/Rejected`.
- **Files:** `onecgiar-pr-server/src/api/results-framework-reporting/results-framework-reporting.controller.ts`, `.service.ts`, `application/queries/get-existing-result-contributors/{get-existing-result-contributors.query.ts, .handler.ts, existing-result-contributors-loader.service.ts, existing-result-contributors.mapper.ts, existing-result-contributors.types.ts}` + their `.spec.ts`.
- **Depends on:** — · **Blocks:** T-2 · **Estimate:** S
- **Verification:** from `onecgiar-pr-server/`: `npx jest src/api/results-framework-reporting/application/queries/get-existing-result-contributors src/api/results-framework-reporting/results-framework-reporting.service.spec.ts --silent` → green; `npx eslint "src/api/results-framework-reporting/**/*.ts" --quiet` clean.
  - *Disqualifier:* a loader test that asserts only "find was called" is not evidence — it must assert the exact `status_id: In([...])` array per scope; the mapper test must assert `result_type_name` for a record **with** and **without** `obj_result_type`. A run that never exercises `scope=foo` proves nothing about IRR-R-3.1.
  - *Input that fails the check:* `status_id = 4` (Discontinued) and `status_id = 8` (Draft) must be absent from the `In` list under `scope=all`; `status_id = 3` (Submitted) must be present only under `scope=all`.
- **Done:** default response byte-identical for existing callers (existing handler spec unchanged and green); Swagger documents the param and fields; `@akili-spec changes/indicator-reported-results` on new blocks.

### `IRR-T-2` — Client: tab shell, data path and host wiring `[x]`
- **Type:** `client` + `tests`
- **Description:** `DrawerTab` gains `'results'`; `initialTab` accepts it; header title/icon map (`Reported results` / `fact_check`); `GET_ExistingResultsContributors(…, scope?)` appends `&scope=` only when given; `loadExisting` requests `'all'`; the dormant smart-default branch is retargeted to `'results'` (it never fires because the reset effect sets `tabTouched = true` — keep that effect as is); new `loadError` signal (non-404 → error, 404 → empty as today); the per-indicator reset effect clears the new state. Add the pure `toReportedResultRow(dto, phases)` → `ReportedResultRow` (category from `result_type_name` else `—`; `phaseName` from `PhasesService.phases.reporting` by `id === version_id` else `String(version_id)`; `contribution` number|null) and `reportedRows` computed with the default order (contribution desc, then code). Remove the *Info* card list; retarget "See them in detail" to `setTab('results')`. Host: `manageIndicator` tab union widened, `onReportingOpenAchieved` passes `'results'`. The tab body may be a placeholder list of codes until T-3.
- **Implements:** `IRR-R-1`, `IRR-R-2.2` (client fallback), `IRR-R-2.3`, `IRR-R-3` (request), `IRR-R-3.2`, `IRR-R-7` (loading + 404 + error signal), `IRR-R-9`, `IRR-R-10` (title/icon), `IRR-AC-1`, `IRR-AC-8`; scenario *Menu lands on the tab* (all clauses), *States* (GIVEN 404 THEN empty; the 500 error signal — its UI lands in T-3).
- **Files:** `…/dashboard-lab/components/indicator-drawer/indicator-drawer.component.ts` + `.html` + `.spec.ts`, `shared/services/api/results-api.service.ts` (+ spec: existing URL assertion stays green, new one for `&scope=all`), `…/dashboard-lab/dashboard-lab.component.ts`, host wiring spec (new small `dashboard-lab.irr-wiring.spec.ts` mounting with the oah-rows recipe, or an `it` in an existing host spec).
- **Depends on:** T-1 (field names) · **Blocks:** T-3 · **Estimate:** M
- **Verification:** from `onecgiar-pr-client/`: `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/components/indicator-drawer src/app/shared/services/api/results-api.service.spec.ts <host wiring spec> --silent` → green, including new `it`s: request URL ends with `&scope=all`; `initialTab 'results'` → header text exactly `Reported results`; `initialTab 'report'` on an indicator **with** results still shows `Report result` (host wins); `toReportedResultRow` category `—` and phase raw-id fallbacks; 500 sets `loadError`, 404 leaves it null and `existing() = []`; Info tab DOM has no `Reported results` heading; host `onReportingOpenAchieved(row)` → `manageTab() === 'results'`.
  - *Disqualifier:* a host test that only checks `manageIndicator` was called is not evidence — assert `manageTab()`. `toBeTruthy()` on the header is not evidence — assert the exact string. A test that stubs the API with an array instead of `{ response: { contributors } }` tests the wrong contract (folder-guide trap).
  - *Input that fails:* a DTO with `result_type_name: null` must map to `—`, never `null`/`undefined` in the cell; a `version_id` absent from the phase list must map to its digits, not to `undefined`.
- **Done:** menu action lands on the tab; one request per open; Info tab list gone; all listed `it`s green.

### `IRR-T-3` — Client: the table, header strip, row actions, search and error UI `[x]`
- **Type:** `client` + `tests`
- **Description:** Replace the placeholder with `app-pr-table` (header/body/empty templates, CSS-grid rows per design §6.3), columns Code · Result (2-line clamp + `title`) · Category · Status pill (local `STATUS_TOKENS` copy with the no-DRY note) · Contribution (right, tabular, `—` for null) · Phase · actions; sortable headers (Code, Status, Contribution, Phase) via `prSortableColumn`; search input rendered only when rows > 8; header strip `N result(s) reported · Σ contribution X of target Y` with `stripTitle()` disclosure when Σ ≠ row ACHIEVED; row click / Enter / Space → `openResult()` (Result Detail + `?phase`, IRR-DD-4), kebab menu (`role="menu"`, Escape/outside close, elevated cell; `.pr-row-menu` rules **copied** into the drawer scss — they are component-scoped in `reporting-aow-table`) with **Open result** and **Copy link** (absolute URL via `PrToastService.add({ key: 'globalUserNotification', … })`, *Result link copied*); skeleton rows while loading; error block *Could not load reported results* + **Retry**; empty block unchanged (CTA → `setTab('report')`). `IRR-R-11` (status split line) and `IRR-R-12` (ctrl/middle-click new tab) if they fit — report which landed.
- **Implements:** `IRR-R-2`, `IRR-R-2.1`, `IRR-R-2.4`, `IRR-R-2.5`, `IRR-R-4`, `IRR-R-4.1`, `IRR-R-5`, `IRR-R-6`, `IRR-R-6.1`, `IRR-R-7` (UI), `IRR-R-10` (table semantics, rows, menu), `IRR-AC-2`, `IRR-AC-4`, `IRR-AC-5`, `IRR-AC-6`; scenarios *The table shows the pipeline* (THEN + AND strip + AND title + BUT clauses), *A way in* (all clauses incl. BUT not on kebab), *States* (THEN CTA → Report; AND IT MUST error + Retry re-requests).
- **Files:** `indicator-drawer.component.ts` + `.html` + `.scss` + `.spec.ts`.
- **Depends on:** T-2 · **Blocks:** T-4 · **Estimate:** L
- **Verification:** `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/components/indicator-drawer --silent` → green with DOM tests asserting, on the 3-row fixture (target 8, row achieved 3): exact cell text per row; pill inline `style` uses `--pr-status-approved-fg/bg` for status 2 and the not-started pair for an unknown id; strip text exactly `3 results reported · Σ contribution 5 of target 8`; strip `title` contains both `3` and `5` and the design §6.2 wording; search absent at 8 rows, present at 9, and typing `88` leaves only `#8871`; Enter on a row → `router.navigate(['/result/result-detail/8871/general-information'], { queryParams: { phase: <vid> } })`; kebab click does **not** navigate; Copy link writes the absolute URL and calls the toast with key `globalUserNotification`; 404 → empty + CTA → `tab() === 'report'`; 500 → error block, Retry → API called again.
  - *Disqualifier:* `toContain('reported')` on the strip or `toBeTruthy()` on the title is not evidence — full strings. A pill test that checks a class name proves presence, not the pair — assert the resolved `style` variable names. Navigation tests must assert the exact commands and queryParams object.
  - *Input that fails:* a row with `contribution: null` must render `—` and be excluded from Σ; a row with `status_id: 99` must use the not-started pair; a search of `zzz` must render the table's empty template, not the "nothing reported" block.
- **Done:** all listed assertions green; `npx ng lint --quiet` clean; `ng build --configuration development` clean (new template bindings).

### `IRR-T-4` — Client: width floor, restore, and the card fallback — real-layout gate `[x]`
- **Type:** `client` + `tests`
- **Description:** `TABLE_FLOOR = 760`; effect on `tab()`: entering `results` with `width() < min(760, clamp)` stores the prior width, sets the floor and emits `widthChange`; leaving restores the stored width unless the user dragged on the tab (a drag clears the memory); `tableLayout = computed(() => width() >= 640)` switches the template between the table and the card layout (cards = the moved markup + pill + kebab). The reset effect clears the memory per indicator. Design §6.2, IRR-DD-5.
- **Implements:** `IRR-R-8`, `IRR-R-8.1`, `IRR-AC-7`; scenario *Room for a table* (all clauses).
- **Files:** `indicator-drawer.component.ts` + `.html` + `.spec.ts`; new `indicator-drawer.reported-results.cy.ts` beside the component (Cypress CT).
- **Depends on:** T-3 · **Blocks:** T-5 · **Estimate:** M
- **Verification:** (1) Jest `npx jest …/components/indicator-drawer --silent` → unit tests on the effect: 520 → 760 on enter, `widthChange(760)` emitted once, restore 520 on leave, drag on the tab prevents restore, floor = 680 when `window.innerWidth = 1000`, 900 stays 900. (2) **Cypress CT** `CT_DEV_SERVER_PORT=8090 npx cypress run --component --spec src/app/pages/result-framework-reporting/pages/dashboard-lab/components/indicator-drawer/indicator-drawer.reported-results.cy.ts` → in real Chromium: mount with `initialTab: 'results'`, viewport 1440, width forced to 520 before the tab → aside `offsetWidth === 760` and a `<table>` present; set width 600 → no `<table>`, `.irr-card` count = row count; viewport 1000 → aside ≤ 680. Run it twice; both runs must agree.
  - *Disqualifier:* jsdom width assertions prove the signal, not the layout — the CT run is the gate for AC-7, and its printed primeicons / `ct-utils` TS2322 errors are documented noise (not evidence either way). A CT whose width is the same before and after entering the tab measured nothing — assert the change. If the two CT runs disagree, report the spread as INCONCLUSIVE, not a pass.
  - *Input that fails:* a drawer already at 900 px must **not** shrink on entering the tab (it is a floor, not a set); `widthChange` must not emit when nothing changed.
- **Done:** Jest + CT green; existing `initialDrawerWidth` tests unchanged and green.

### `IRR-T-5` — Docs + live SP01 check
- **Type:** `docs` + manual verification
- **Description:** Update `components/indicator-drawer/CLAUDE.md` (three tabs, `scope=all`, the width floor, the reset list, the pill-copy note; re-stamp `Verified:`) and `dashboard-lab/CLAUDE.md` if it names the drawer tabs. Live check in the authenticated Orca browser (`orca-cli` skill; capture and restore the tab URL): SP01 Reporting tab → an indicator with ACHIEVED > 0 → menu → **View reported results** → read the rendered rows (code, category name, pill text, contribution, phase) and the strip via `orca eval`; then one indicator with nothing reported → empty state. Record both reads in `execution.md`.
- **Implements:** defect class *fixture-shaped blindness*; confirms assumptions A-1 (`related_node_id` present on Reporting rows), A-2, and `IRR-R-2.2` with real type names.
- **Files:** the two folder guides, `execution.md`.
- **Depends on:** T-4 · **Blocks:** — · **Estimate:** S
- **Verification:** pasted `orca eval` output showing ≥ 1 row with a non-empty Category name and a phase **name** (not digits), the strip string, and the empty-state copy on the virgin indicator; `orca tab list` shows the original URL restored.
  - *Disqualifier:* a row whose Category shows `—` or whose Phase shows digits means A-1/A-2 or the mapping failed on real data — report INCONCLUSIVE with the raw payload, do not mark passed. If the dev server's backend lacks the T-1 change (no `result_type_name` in the payload), the check is INCONCLUSIVE.
  - *Input that fails:* an indicator with a contribution in *Submitted* or *Editing* state must show that pill (proves `scope=all` reached the server); if none exists on SP01, say so and pick a program that has one.
- **Done:** guides updated; `execution.md` carries both live reads with PASS / INCONCLUSIVE.

## 4. Dependency graph

```
IRR-T-1 (server param + field)
   └── IRR-T-2 (tab shell, data, host wiring)
         └── IRR-T-3 (table, strip, actions)
               └── IRR-T-4 (width floor + fallback, CT gate)
                     └── IRR-T-5 (docs + live check)
```

Strictly serial. Cut point after T-3: the feature is usable; T-4 is polish behind a CT gate, T-5 docs.

## 5. Scenario-clause coverage

| Requirement / scenario clause | Owner |
|---|---|
| IRR-R-1 THEN tab + title · AND `scope=all` · BUT no form first / Report button unchanged · AND IT MUST host `initialTab` wins, no auto-switch to Info | T-2 |
| IRR-R-2 columns/order · R-2.1 pills · R-2.4 contribution · R-2.5 clamp + title | T-3 |
| IRR-R-2.2 category name — server / client `—` fallback | T-1 / T-2 |
| IRR-R-2.3 phase name + raw fallback | T-2 |
| IRR-R-3 all scope shown with pills (request / filter) · AND IT MUST omit Discontinued/Rejected | T-2 / T-1 |
| IRR-R-3.1 default unchanged (no param, `reviewed`, `foo`) · AND IT MUST 3 rows only for `all` | T-1 |
| IRR-R-3.2 one request shared | T-2 |
| IRR-R-4 strip · R-4.1 disclosure title with both numbers | T-3 |
| IRR-R-5 click / Enter / Space / Open result / Copy link · BUT not on kebab | T-3 |
| IRR-R-6 sort + `aria-sort` · R-6.1 search > 8 | T-3 |
| IRR-R-7 loading skeleton / empty + CTA → Report / 500 error + Retry / 404 = empty | T-2 (signals, 404) + T-3 (UI, CTA, Retry) |
| IRR-R-8 floor 760 · restore · drag keeps working · BUT clamp on 1000 px · R-8.1 cards < 640 | T-4 |
| IRR-R-9 Info keeps Target/split, list removed; "See them in detail" → results | T-2 |
| IRR-R-10 title/icon · table semantics, focusable rows, menu roles | T-2 · T-3 |
| IRR-R-11 (SHOULD) · IRR-R-12 (MAY) | T-3 if time allows; otherwise reported as not delivered |
| IRR-AC-1..8 | AC-1/8 T-2 · AC-2/4/5/6 T-3 · AC-3 T-1 · AC-7 T-4 |

## 6. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `IRR-TEST-1` | unit (server) | IRR-R-3, R-3.1, R-2.2, AC-3 | `…/get-existing-result-contributors/*.spec.ts` |
| `IRR-TEST-2` | unit + DOM (client) | IRR-R-1, R-2.x, R-3.2, R-4.x, R-5, R-6.x, R-7, R-9, R-10, AC-1/2/4/5/6/8 | `…/indicator-drawer/indicator-drawer.component.spec.ts`, host wiring spec, `results-api.service.spec.ts` |
| `IRR-TEST-3` | Cypress CT (real layout) | IRR-R-8, R-8.1, AC-7 | `…/indicator-drawer/indicator-drawer.reported-results.cy.ts` |
| `IRR-TEST-4` | manual live | fixture-shaped blindness, A-1/A-2 | Orca browser, `execution.md` |

Client coverage stays above 50/60/60/60; server above 5/20/35/40.

## 7. Rollout & verification
- ☐ Single PR against `staging`: `✨ feat(indicator-drawer) [SPEC:changes/indicator-reported-results]: reported results as a table in the indicator drawer`. Body per `cognitive-doc-design`: review `indicator-drawer.component.ts` first, then the server query; out of scope = Results tab, bilateral routing branch (IRR-DD-4).
- ☐ CI green (server + client lint/tests, build, SonarCloud).
- ☐ QA on test env: repeat T-5 on one indicator with mixed statuses and one virgin indicator.

## 8. Cleanup & follow-ups
- ☐ `/akili-archive`: record IRR-DD-4 accepted gap and the pill-pairs fourth copy.
- ☐ Follow-up: extract `STATUS_TOKENS` into `shared/` (own PR).

## 9. Judgment-day record
One pass, 2026-09-03. Both blind-judge spawns and their retries failed on the harness (Orca pane timeout), so the review ran **inline by the author** (recorded deviation — weaker than two blind readers). Findings applied: (1) SEVERE-class — `ResultStatusData` also defines `Draft (8)`, so "all statuses except Discontinued/Rejected" would have included it → *All scope* is now an explicit five-member list (requirements §6/§10, design §4.1/§5, T-1); (2) WARNING — `.pr-row-menu` styles are component-scoped, not global → copy into the drawer scss (design §6.2, T-3); (3) WARNING — toast service unnamed → `PrToastService` (`shared/components/pr-toast`) named (design §6.2, T-3); (4) info — test LOC estimate raised 350 → 450 (`KZ-REH-1` recurrence). Verified true: `Result.obj_result_type` exists (`result.entity.ts:96`); `pr-table` exports `PrTableHeaderDirective`/`PrTableBodyDirective`/`PrTableEmptyDirective`/`PrSortableColumnDirective`; the drawer's reset effect sets `tabTouched = true`, so `initialTab` always wins; handler/loader/mapper specs exist. Not verified (left to T-5's disqualifier): that `phases.reporting[].id` equals a result's `version_id` on real data. Ledger: `judgment.md`. **JUDGMENT: APPROVED ✅ (inline fallback)**

## 10. Roll-back plan
1. Revert the single PR. No data, flags or migrations involved.

## Required cross-references
- `requirements.md`, `design.md` (same folder); `docs/prd.md` US-P1, G1; `docs/ux-ui/design.md` §6, §9, §10; `docs/trd/trd.md` §2.
