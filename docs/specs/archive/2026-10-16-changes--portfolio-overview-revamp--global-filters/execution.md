# Execution — Portfolio Overview: global filters

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/global-filters/` |
| Started | 2026-10-16 |
| Branch | `qa-development-2026-ss` (no commit without explicit go-ahead) |
| Approval Mode | gated. On 2026-10-16 the user said to "continue until done": routine PASS gates proceed; HALT, pivot, tripwire and GLF-T-8 HITL still stop |
| Leader | Claude Code (opus); Implementer `akili-implementer`; Reviewer `akili-reviewer` (wrappers) |
| Budget | 8 tasks · ≈ 1,500 LOC added / ≈ 120 removed · ≤ 12 review rounds |
| Review rounds used | 12 (T-2 ×1; T-1 ×3; T-3 ×1; T-6 ×2; T-7 ×1; T-4 ×3, the third after reopening from T-8; T-5 ×1). The ceiling was raised to about 15 by the user |
| Final status | **8/8 tasks PASS (2026-10-16).** Ready for `/akili-archive` |

## Leader decisions

- **2026-10-16, before GLF-T-2: the disqualifier escalated to the user.** `resolveStatusSlot` lived in `portfolio-overview.service.ts`, an `@Injectable` module with Angular imports. In T-3 the service will import `portfolio-filters.ts`, which would create an import cycle, and the pure file would load Angular at runtime. The user chose the following: move `resolveStatusSlot` unchanged to a pure `services/portfolio-status-slot.ts` and re-export it from the service, so there is one map and no copy.
- **Parallelism:** T-1 (server) and T-2 (client) ran at the same time, on disjoint trees. Jest runs were serialized through a shared lock file (`%TEMP%\akili-jest.lock`).
- **T-1 review mode:** two parallel lens Reviewers, one for spec conformance and one for security/risk, because the task adds a new API surface with auth.

- **Forward pointer for GLF-T-5 (2026-10-16, from session onecgiar-pr-92, which runs spec #9):**
  - That session edited `portfolio-overview.component.spec.ts`: it added an import of `STATUS_GUIDE_URL` and 2 cases for the status link. It also edited `shared/constants/portfolio-links.constants.ts`.
  - The T-5 brief must say: keep those edits and do not revert them.
  - At commit time, stage by explicit path.
  - Send the commit hash and any renames to onecgiar-pr-92. They are waiting on `filteredRows`, `filtersPending`, `filteredTotal`, `dimensions`, `dimensionIndex` and `RawResult.id/title/result_level_name`.

## Task Execution History

### GLF-T-2 — Client: wire types, API method and pure filter logic — PASS (2026-10-16)

- **Attempts:** 1. Skills: `angular-developer`, `tdd`. Effort: high.
- **Files:**
  - `shared/interfaces/portfolio-result-dimensions.interface.ts` (new)
  - `shared/services/api/results-api.service.ts` (+1 method, `GET_PortfolioResultDimensions`) and its spec (+3 cases)
  - `portfolio-overview/services/portfolio-filters.ts` (new) and `portfolio-filters.spec.ts` (new, 61 tests)
  - `portfolio-overview/services/portfolio-status-slot.ts` (new: `resolveStatusSlot` moved unchanged, plus `PORTFOLIO_STATUS_SLOTS`)
  - `portfolio-overview/services/portfolio-overview.service.ts` (relocation only: import + re-export)
- **Verification:**
  - Red: the filters spec failed with `1 failed, 1 passed` before the file existed.
  - Green: `CLI"portfolio-filters\.spec|results-api\.service\.spec"` gave `Test Suites: 2 passed, Tests: 378 passed`.
  - Relocation regression (`…|portfolio-overview\.service\.spec|typology`): `5 passed / 443 passed`.
  - Mutation check: 4 deliberate breakages made 7 specs fail; the code was then restored.
  - eslint `--quiet` exits 0 on all 6 files.
- **Reviewer (attempt 1): PASS.**
  - All 10 falsifiers have real assertions.
  - The relocation is verbatim, the re-export is present, and the mapping is not copied anywhere.
  - Neither pure file loads Angular at runtime.
  - Option order and labels match the R-3 table.
- **ADVISORY (recorded, not acted on):**
  - Reliability: the status keys, labels and order now exist twice, in `PORTFOLIO_STATUS_SLOTS` and in the service's `STATUS_SEGMENT_DEFINITIONS`. A later change could build one from the other.
  - Risk: Project options use the phase-wide `w3ProjectIds`, but R-3 says "page row". The two only diverge when `isPartial()` is true.
  - Readability: a type option's label is the first raw spelling seen, not a canonical name.
  - Readability: `normalizeType` repeats the string rule of `typology.aggregate.ts`.
- **Implementer "Not Done / Assumptions", adjudicated by the Leader:**
  - The API spec was never seen failing before the method existed: the method was added before the first run. **Accepted.** A missing method fails TypeScript compilation, and the Reviewer confirmed the assertions are behavioural.
  - The other notes are design interpretations within §6.2, not owed scope:
    - typology levels are listed only when they have rows;
    - type tokens are lowercased and whitespace-collapsed;
    - `matchesRow` returns `'match' | 'miss' | 'unknown'`, and a definite miss wins over unknown;
    - `FilterRow` is a local type until T-3 widens `RawResult`.
- **Requirements covered:** GLF-R-2 (S-2.1..S-2.4), R-3 (S-3.1), R-5 (link rule), R-9 (S-9.1 list), R-13 (unknown), R-14 (codec and S-14.1 sanitize). Design DD-2, DD-5, DD-11.
- **Commit:** none. Waiting for the user's go-ahead.

### GLF-T-1 — Server: `GET portfolio/result-dimensions` — PASS (2026-10-16)

- **Attempts:** 2. Skills: `nestjs-expert`, `api-design-principles`, `tdd`. Effort: high on attempt 1, xhigh on attempt 2. Review: two parallel lens Reviewers (spec conformance + security), then a delta re-review.
- **Files:**
  - `onecgiar-pr-server/src/api/results/result.repository.ts`: one hunk, `@@ -4406,0 +4407,74 @@`, pure additions only. `AllResultsByRoleUserAndInitiativeFiltered` has no diff.
  - `result.repository.spec.ts`
  - `results-framework-reporting.service.ts` and its spec
  - `results-framework-reporting.controller.ts` and its spec
  - `dto/portfolio-result-dimensions.dto.ts` (new)
- **Attempt 1:**
  - Red: `3 failed, 1 passed` (compile errors, because the methods did not exist yet).
  - Green: `4 passed / 256 passed`. eslint exits 0.
  - Incident: two spec files were emptied by mistake, by a PowerShell alias collision (`Rd` = `Remove-Item`). Both were clean in git and were restored with `git checkout --`. The final numstat shows additions only.
  - Conformance Reviewer: **PASS**. Every falsifier has an assertion, and the response matches §4.1 exactly. Coercion is identical to #8.
  - Security Reviewer: **FAIL**, issue #1 (verbatim summary below):
    - The repository catch block calls `returnErrorRepository({…, debug: true})`, and `error.utils.ts:38-39` then runs `_logger.error(error)`. That logs the full `QueryFailedError`, including the SQL text and the bound parameters.
    - Violated: GLF-T-1 DoD "No SQL text in errors or logs", NFR Security, design §4.1 row 500, and precedent `65e70258f`.
    - Remediation: `debug: false`, plus a spec assertion with `objectContaining({ debug: false })`.
- **Attempt 2:**
  - The repository now passes `debug: false`, with the precedent's comment, and a new spec case was added.
  - Red with `debug: true`: `1 failed, 85 passed`. Green: `4 passed / 257 passed`. eslint exits 0.
  - Security re-review: **PASS**. The error object is never logged. The thrown message keeps status 500, so it skips the 4xx log branch. The service returns a generic 500 and logs only the error code.
- **ADVISORY (recorded, not acted on):**
  - The repository spec's `${` check cannot fail at runtime, so it is belt-and-braces only.
  - `centerLabelsSql` repeats the Center-link scan in an `IN (subquery)`. If the T-8 p95 comes close to 3 s, build the labels from the distinct `centerLinks` codes instead.
  - There is no `ORDER BY`, so T-8 must compare payloads as sets.
  - `centers` has no flag that marks a code-only fallback row.
  - The 4xx passthrough still uses `debug: true`. This is identical to #8 and safe today, because its only 4xx source is `throwServiceError(NOT_FOUND)`.
  - The project-label INNER JOIN has no code fallback. The conformance Reviewer verified that `results_by_projects.project_id` is NOT NULL with a foreign key, so every linked project has a label.
- **Not Done / Assumptions:** live correctness of the pairs and the non-admin 403 are deferred to GLF-T-8, as the task's Disqualifier requires.

### GLF-T-3 — Client: service state, `filteredRows` and the aggregations moved — PASS (2026-10-16)

- **Attempts:** 1. Skills: `angular-developer`, `tdd`. Effort: high. Review: full.
- **Files:** `portfolio-overview/services/portfolio-overview.service.ts` and its spec (22 new cases).
  - The only change to old fixtures is a default `GET_PortfolioResultDimensions` mock in `setupService`.
- **Verification:**
  - Red: `22 failed, 26 passed`. Green: `1 suite / 48 passed`.
  - Consumers (`portfolio-overview\.component\.spec|typology-block|portfolio-filters`): `4 passed / 123 passed`. No failures to hand on to T-5.
  - eslint exits 0.
- **Reviewer: PASS.**
  - The disqualifier holds: no existing `it` or `expect` was touched.
  - DD-6 is complete:
    - `centerDistributionRows`, `bilateralTotal` and `bilateralBars` move through `bilaterals()`, which now reads `filteredRows()`.
    - `programmeName` and `portfolioAcronym` stay on `rows()`. They are lookups or labels, not figures.
  - Every falsifier has a real assertion.
- **ADVISORY (recorded, not acted on):**
  - Reliability: `load()` does not reset `dimensions`. A reload therefore reconciles against the previous map for a moment, and could drop a Project or Center value that the new map would accept.
  - Resilience: a Project or Center selection made **after** the map has failed is kept, and `filtersPending()` stays true until Retry. T-4 disables those controls in the error state.
  - Readability: no log line when the map request fails.
  - For T-5, the Leader forwards this one: `filteredRows()` returns only definite matches while the map is pending, so `filteredTotal()` is 0. T-5 **must** gate the no-match panel on `filtersPending()`.
- **Not Done / Assumptions, adjudicated:**
  - `dimensionsNotice` is a boolean. The copy for it belongs to T-4 and T-5.
  - With no rows, there is no request and the status is `idle`.
  - A response with no payload counts as a failure.
  - `reconcileSelection` runs on `setPhase` and `setSelection`, not on `toggle`.
  - The folder `CLAUDE.md` update belongs to T-5.
  - None of these is owed scope.
- **Requirements covered:** GLF-R-4 (S-4.1), GLF-R-13 (state, S-13.1), GLF-R-15. Design §6.3, DD-4, DD-5, DD-6.

### GLF-T-6 — Client: ToC KPI and Projects blocks narrow by selection — PASS (2026-10-16)

- **Attempts:** 2. Skills: `angular-developer`, `tdd`. Effort: medium on attempt 1, high on attempt 2. Review: checklist.
- **Files:**
  - `components/toc-kpi-block/`: the component (`.ts` and `.html`), `toc-kpi.format.ts` (`filterRowsByPrograms`, `sumRows`) and the specs.
  - `components/projects-block/`: the component (`.ts` and `.html`), `projects.format.ts` (`filterProjectRows`) and the spec.
  - `internationalization/portfolio-overview.copy.ts`: the `filters` group, with `dimensions`, `notAffected(list)` and `totalsWholePortfolio`.
- **Attempt 1:**
  - Red: `7 failed, 84 passed`. Green: `5 passed / 94 passed`. eslint exits 0.
  - Reviewer: **FAIL**, issue #1. The strings went into a new copy group, `filterNotes`, but design §6.7 names a single `filters` group. Remediation: rename the group.
  - Root cause: the Leader's brief had suggested "a clearly named place". The error was the Leader's, not the Implementer's.
- **Attempt 2:**
  - The group was renamed from `filterNotes` to `filters`. `filterNotes` now has 0 hits.
  - Green: `5 passed / 94 passed`. eslint exits 0.
  - Re-review: **PASS**.
- **Reviewer, confirmed on attempt 1:**
  - S-6.1 summary reads 15/50 and 30%. A mutation that kept the server summary would show 16/55, so the test catches it.
  - No refetch: `pending()` stays at 0 and the API is called once.
  - S-7.1: Unassigned and non-CIAT rows are hidden, the KPIs are unchanged and the caption shows.
  - S-9.1: the "Not affected by" line renders as specified.
  - The inputs are optional, and the templates use tokens only.
- **Not Done / Assumptions:** P-5 was not re-verified against live data. It was verified at design time from service code `:950-958`, and the disqualifier did not trigger. The folder `CLAUDE.md` update belongs to T-5.
- **Requirements covered:** GLF-R-6 (S-6.1), GLF-R-7 (S-7.1 + bullets), GLF-R-9 (render). Design §6.6, DD-8.

### GLF-T-7 — Client: Centers block applies the global selection — PASS (2026-10-16)

- **Attempts:** 1. Skills: `angular-developer`, `tdd`. Effort: high. Review: full.
- **Files:**
  - `components/centers-block/centers-block.aggregate.ts`: `applyGlobal`, which reuses `matchesRow` and `isActive`, so no map is copied.
  - `centers-block.component.{ts,html}`: optional inputs `selection`, `dimensionIndex` and `dimensionsVersionId`; new computeds `honoursProject`, `notAffected`, `visibleCenterRows` and `globalCenters`.
  - `internationalization/portfolio-centers-block.copy.ts`: `dimensions` and `notAffected`.
  - Specs: 11 new aggregate cases and 11 new component cases.
- **Verification:**
  - Aggregate red: `11 failed, 18 passed`. Component red: `8 failed, 67 passed`.
  - Green: `3 suites / 75 passed`. eslint exits 0. No pre-existing case was edited.
- **Reviewer: PASS.**
  - The order is global, then origin, then status tile.
  - `kpis()` reads `globalCenters()` and ignores origin.
  - The request count stays at 15.
  - All 5 falsifiers are real assertions, and the DD-4 disqualifier holds.
  - Adjudication (c): the duplicated labels are allowed, because §6.7 keeps Centers strings in the Centers copy file.
- **ADVISORY (recorded):**
  1. **DD-5 gap.** If Project is selected and honoured but `dimensionIndex` is still null, `applyGlobal` treats "unknown" as a miss, so the block shows zeros as if they were filtered. **Leader decision:** carry this into the T-5 wiring. T-5 already owns the value of `[dimensionsVersionId]`, and §6.5 does not fix that value. Pass `dimensionsVersionId = dimensionIndex() ? versionId : null`, so that while the map loads, Project shows as "Not affected by: Project" (GLF-R-9), which is honest. This chooses a value inside T-5's own wiring scope. It is not a new task.
  2. The aggregate test name says "pending" but the test asserts a miss.
  3. The Centers copy could reference `PORTFOLIO_OVERVIEW_COPY.filters` and still live in the Centers file.
  4. `bilateralNew + bilateralReplicated === bilateral` is always true. The real typology check is `bilateral === 3`.
  5. The "Not affected by: Project" line can flicker while the block's own phase is still resolving. Cosmetic.
- **Not Done / Assumptions:**
  - The zeros-while-loading behaviour is resolved by advisory 1 through T-5.
  - `dimensionsVersionId` null means Project is not honoured; accepted.
  - Wiring the inputs is T-5's work.
- **Requirements covered:** GLF-R-8 (S-8.1, S-8.2, Project between cycles), GLF-R-9 (render). Design §6.6, DD-9.

### GLF-T-4 — Client: filter bar and multi-select — PASS (2026-10-16)

- **Attempts:** 2. Skills: `angular-developer`, `spartan`, `tailwind-design-system`, `frontend-design`. Effort: medium-high on attempt 1, high on attempt 2. Review: checklist.
- **Files:**
  - `components/filter-bar/` (new): `filter-multi-select.component.{ts,html,spec.ts}` and `filter-bar.component.{ts,html,spec.ts}`.
  - `internationalization/portfolio-overview.copy.ts`: about 20 keys added to the `filters` group, reusing `filters.dimensions`.
  - `spartanBrainMock.ts` was not touched.
- **Attempt 1:**
  - Green: `2 suites / 18 passed`. eslint (ts+html) exits 0.
  - No red run was recorded. The components did not exist yet, so the specs could only fail at compile.
  - Reviewer: **FAIL**, three issues:
    1. The popover was not anchored. A plain `<button>` trigger with no `[attachTo]` makes Brain fall back to global centring (`spartan-ng-brain-overlay.mjs:207-212`). Violates design §6.4 and DD-10.
    2. The template's `[attr.aria-selected]` clashes with `BrnCommandItem`, which host-binds `aria-selected` to the keyboard-active row (`spartan-ng-brain-command.mjs:315`). Violates §6.4 and NFR Accessibility.
    3. `text-white` is not a token. Violates the T-4 DoD and client CLAUDE.md §5 rule 8.
  - The Reviewer ruled that the plain-button trigger does not breach the "fix the mock, never the template input" disqualifier, because it is a different, established composition (`program-overview`, `results-notifications`).
- **Attempt 2:**
  - Fixes: `#trigger` with `[attachTo]="trigger"`; `[attr.aria-checked]` on items; `text-[var(--pr-color-white)]`; and `aria-controls` bound only while open (advisory-grade, same lines).
  - Green: `2 suites / 20 passed`. eslint exits 0.
  - Re-review: **PASS**.
- **Execute-time design deviation (pending user acceptance):**
  - Design §6.4 says "items use `aria-selected`". The implementation uses `aria-checked`, which ARIA 1.2 allows on an `option` inside a multiselectable listbox, because Brain owns `aria-selected` for the active row.
  - The user accepted this on 2026-10-16, and design.md §6.4 has been amended.
- **ADVISORY (recorded):**
  - Below 768 px, `#controls` renders twice, so element ids repeat.
  - The `mapError` copy paraphrases R-13.
  - Brain's unnamed `role="dialog"` popover container: check `role="presentation"` at T-8.
  - The `ng build` did not AOT-check these templates, because the bar is not mounted yet. T-5's build is the first real check.
  - The header comment should mention `[attachTo]`.
- **Not Done / Assumptions, all for T-8 browser checks:** real popover position, wrapping, the sheet at 375 px, focus order, Escape, arrow keys and the Command search.
  - Other choices: the sheet opens from the bottom; "Filters (n)" counts selected values; an extra "Applying filters…" text shows while pending; a `noResults` key was added for T-5.
- **Requirements covered:** GLF-R-1 (S-1.1), GLF-R-3 (render + search), GLF-R-13 (controls), NFR Accessibility and Responsive (presence only). Design §6.4, §6.7, DD-10.

### GLF-T-5 — Client: page wiring, status tiles, URL sync and docs — PASS (2026-10-16)

- **Attempts:** 1. Skills: `angular-developer`, `spartan`. Effort: high. Review: full.
- **Files:** `portfolio-overview.component.{ts,html,spec.ts}` and `portfolio-overview/CLAUDE.md` (112 lines; re-stamped `Verified: 2026-10-16 … global-filters (GLF-T-5)`).
- **Verification:**
  - Red: `17 failed, 39 passed`. Green: `56 passed` (the baseline before was 42).
  - DoD consumers (`typology-block|toc-kpi-block|projects-block|centers-block|filter-bar|portfolio-overview`): `16 suites / 399 passed`.
  - `ng build --configuration development` passes. This is the first AOT check of the filter bar. The only warnings are NG8112/NG8113, in unrelated components.
  - eslint is clean. A grep of the client `src` for `selectedStatusFilter|toggleStatusFilter` returns 0 hits.
- **Assertions rewritten** (DD-7 #1; all tied to `selectedStatusFilter`; the Reviewer verified each):
  - "renders dynamic status pipeline… with filter toggle": 3 expectations.
  - "toggles the status filter when the Rejected tile is clicked": 2.
  - "handles interactive clicks on charts": 1.
- **Forward pointers carried:**
  - The #9 session's edits are intact.
  - Sub-switch order: `filtersPending()` → skeletons, else `filteredTotal()===0` → no-match panel, else sections. The ToC KPI block sits outside the sub-switch.
  - Centers gets `dimensionsVersionId = dimensionIndex() ? versionId() : null`.
  - `notAffected` comes from `notAffectedBy`.
- **Reviewer: PASS.** Every falsifier has a real assertion. The first-load empty `navigate` is harmless: `replaceUrl`, a same-URL navigation is ignored, and it is also the call that strips unknown params, as S-14.1 requires.
- **ADVISORY (recorded):**
  - The page case for S-13.1 uses a pending Project, while the falsifier names Center. The service spec covers Center.
  - S-14.1 is checked against a mocked Router. A `RouterTestingHarness` would prove the URL and history themselves; T-8 checks this live.
  - `navigate` does not set `preserveFragment`.
  - "View in Results Center →" is still a hard-coded string.
  - Spec text: design.md DD-7 table row #1 says "GLF-T-6 rewrites them". It should say GLF-T-5. Fix at archive.
- **Not Done / Assumptions:** none owed. The other builders in the page spec do not mock the map, and they still pass.
- **Requirements covered:** GLF-R-1 (gating), R-5 (S-5.1, S-5.2), R-10 (S-10.1), R-13 (S-13.1), R-14 (S-14.1), R-15. Design §6.5, DD-7, DD-11.

### GLF-T-8 — HITL verification (in progress, 2026-10-16)

Run with the user. The Leader read the browser through Claude in Chrome, on `localhost:4200`. Only reads and filter state were used; no write button was clicked.

| Check | Result |
|---|---|
| P-11 indexes (user, DBeaver) | ✅ `results_center` has `FK_7c98…(result_id)`. `results_by_projects` has `FK_3abb…(result_id)`. The premise is now **verified** |
| Open version | 36, "Reporting 2026" |
| Parity: Center CENTER-03, CIAT (Alliance) | ✅ page 141 = SQL 141. The bar reads "141 of 1,000 results", and the KPI total is 141 |
| Parity: CENTER-02, Bioversity (Alliance) | ✅ page 235 = SQL 235 |
| Parity: CENTER-11, IITA | ✅ page 160 = SQL 160 |
| Parity: W3 project 1368 | ✅ page 58 = SQL 58 |
| No P-2 duplicate rows observed | ✅ distinct ids equal `filteredTotal`, 141 = 141 |
| Endpoint timing, 3 calls, v36 | ✅ 666 / 661 / 658 ms. The spread is 8 ms, so the p95 is about 0.67 s, against a 3 s budget |
| Payload size (P-12) | ✅ 78,568 bytes, against a 4 MB limit. The premise is now **verified** |
| Client recompute, 5 runs of one selection change | ✅ median 0.7 ms, range 0.5–2.4 ms (signals only, render not included), against a 150 ms budget |
| URL restore: `?status=editing&foo=1` | ✅ `{editing}` is restored and `foo` is kept |
| URL restore: `?center=CENTER-03` | ✅ on the second load (`{CENTER-03}`, map ready). On the first load in a fresh tab the selection read empty and the URL was stripped. That **could not be reproduced**; it was possibly a stale bundle during an `ng serve` rebuild. Re-check after the T-4 fix |
| **Dropdowns (user report: "los clicks no sirven en los dropdowns")** | ❌ **DEFECT.** `open()` becomes true, but the overlay is empty. The console shows `NG0201: No provider for TemplateRef` from `BrnCommandEmpty`. `filter-multi-select.component.html:87` uses `<p brnCommandEmpty>`, an attribute, but the directive is structural (`*brnCommandEmpty`). The jsdom mock is not structural, so the specs passed. **GLF-T-4 is reopened as attempt 3** |
| Non-admin 403 | ✅ accepted by the user (2026-10-16: "el tema de admin pasalo de una vez porque ese modulo no aparece para guests"). No live non-admin call was made. Guard and role metadata are asserted in the T-1 specs |
| After the T-4 attempt-3 fix: the dropdowns | ✅ Program renders 14 items, anchored below its trigger (content y=324, trigger bottom 318). Clicking SP01 filters: CIAT+SP01 = 57, and the URL updates |
| `?center=CENTER-03` on reload | ✅ restored `{CENTER-03}`, 141 |
| Back button / history (S-14.1) | ✅ `history.length` stayed at 5 across 3 more filter changes, so no entries were added |
| Layout at 375 / 768 / 1280 | ✅ checked by the Leader through same-origin iframes at fixed widths, because the window resize had no effect. **375:** "Filters (2)" opens the sheet, which holds all 5 triggers; no horizontal scroll (scrollWidth 362). **768:** the "Filters (n)" button shows instead of the row, because this project's `md` breakpoint is 900 px (`docs/ux-ui/design.md` §9, `_viewport-page.scss:43`), not the 768 px written in design §6.4. That is consistent with the project's breakpoints; record it at archive. No horizontal scroll. **1280:** all 5 triggers fit on one row; no horizontal scroll |

**GLF-T-8: PASS (2026-10-16).** Every check is ✅. The family manifest marks #6 `done`, with a log row. Commit and push to `qa-development-2026-ss` were authorised by the user ("ya podemos pasar a mi rama con push y todo?").

#### PRTest smoke — 2026-10-19

Run after `performance-refactor` (`13980266c`) was merged into `staging` (`69ec8981a`). The Leader read `prtest.ciat.cgiar.org` through Claude in Chrome with the user's admin session. Only filter state and reloads were used; no write button was clicked.

| Check | Result |
|---|---|
| Page load, admin | ✅ the filter bar (Program, Project, Center, Typology, Status) renders; 1,002 results, version 36 |
| Center filter: CENTER-06, CIP | ✅ "124 of 1,002 results". KPI split: W1/W2 new 36 + W3 new 35 + W1/W2 replicated 1 + W3 replicated 52 = 124. The URL updates to `?center=CENTER-06` |
| Reload with `?center=CENTER-06` | ✅ restored: CIP chip, 124 of 1,002 |
| Endpoints, v36 | ✅ `portfolio/result-dimensions`, `toc-results/portfolio-coverage` and `portfolio/bilateral-projects` return 200. `result-dimensions` without a token returns 401 |
| Blocks | ✅ all 7 render (Reporting Status, Results by typology, Progress against ToC KPIs, CGIAR Centers, Reporting status, W3/Bilateral projects, Results detail). No console errors |
| Non-admin | ✅ confirmed by the user on PRTest: a guest cannot open Portfolio overview (`CheckAdminGuard`) |

**PRTest smoke: PASS.** This closes the follow-up recorded in `archive-summary.md`.

#### GLF-T-4 attempt 3 (reopened from T-8) — PASS

- **Root cause:** `<p brnCommandEmpty>` was used as an attribute, but `BrnCommandEmpty` is structural. That caused NG0201, and the popover content did not render.
- **Fix:** the template now uses `*brnCommandEmpty`. In `spartanBrainMock.ts`, `BrnCommandEmpty` is now structural: it injects `TemplateRef` and `ViewContainerRef`, and `BrnCommand` gained an `_itemCount` signal. Two new specs were added.
- **Red/green:** with the old form, `10 failed` with NG0201. Shared-mock consumers (`portfolio-overview|centers-block|global-search|filter-bar|filter-multi-select|results-notifications`): `40 suites / 1311 passed`.
- **eslint:** the html and spec are clean. 5 `no-input-rename` errors remain on aliased stubs that were already in the mock, which the Reviewer confirmed.
- **Reviewer: PASS.**
- **Kaizen lesson (for archive):** jsdom mocks of Brain directives must match whether the real directive is structural or an attribute directive. Otherwise a template that cannot render in the browser still passes every spec. Add this to the folder `CLAUDE.md` gotcha about `spartanBrainMock` at archive.

## Budget tripwire — 2026-10-16, after GLF-T-4

| Measure | Budget | Actual (before T-5 and T-8) |
|---|---|---|
| Tasks | 8 | 8, unchanged |
| LOC | ≈ 1,500 added / ≈ 120 removed | ≈ 3,060 added (1,593 in tracked diffs + 1,467 in new files) / 53 removed |
| Review rounds | ≤ 12 | 10 |

**Cause:** about 60 % of the added lines are specs.
- T-2: the pure-logic spec alone has 61 tests.
- T-3: 22 cases. T-6: about 10. T-7: 22. T-4: 20.
- The falsifier lists asked for this depth. The design's estimate counted tests in the 1,500 but under-sized them.
- The figure also includes about 10 lines that the #9 session added to the page spec and `portfolio-links.constants.ts`.
- Production code is roughly 1,200 lines, close to the design's client 1,150 + server 350.

**Execution stopped for the user's decision** before GLF-T-5.

**User decision (2026-10-16):**
- Continue with GLF-T-5 and accept the overrun. It is test volume, not scope.
- The review-round ceiling rises to about 15.
- The `aria-checked` deviation is accepted, and design.md §6.4 has been amended. The Correction Closure sweep found `aria-selected` nowhere else in requirements.md or tasks.md.
- **Requirements covered:** GLF-R-11 (1)–(4), S-11.1, S-11.2, GLF-R-12 (metadata), NFR Security. Design DD-1, DD-3, §4, §5.
- **Commit:** none. Waiting for the user's go-ahead.
