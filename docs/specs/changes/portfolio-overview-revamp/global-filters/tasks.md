# Tasks — Portfolio Overview: global filters

## 1. Scope of this task list

| Field | Value |
|---|---|
| Linked spec | [`requirements.md`](./requirements.md) (approved) + [`design.md`](./design.md) (approved 2026-10-16, Phase 2 gate, no Judgment Day) |
| Parent | `changes/portfolio-overview-revamp` (family #6) |
| Owner | santiago.sanchez@cgiar.org |
| Status | approved (2026-10-16, Phase 3 gate) — ready for `/akili-execute` |
| Branch | `qa-development-2026-ss` (no commit without explicit go-ahead) |
| Budget | 8 tasks · ≈ 1,500 LOC added / ≈ 120 removed · ≤ 12 review rounds (design §14). Exceeding any of them stops execution for the user |

**Rules for every task that runs tests** (machine rules; copy them into each delegated brief):
- Every Jest run carries `--maxWorkers=2` and is scoped with `--testPathPattern`. Never run an unscoped suite.
- Only one test run at a time on the machine. Never alongside a build or a browser check.
- Lint only the touched files: `npx eslint <files> --quiet` (client: `ESLINT_USE_FLAT_CONFIG=false`).
- Check free RAM before a heavy run. If it is below 4 GB, stop and tell the user.
- `onecgiar-pr-server/src/a.py` is never staged.

**Commands used below:**
- `SRV` = `cd onecgiar-pr-server && npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern=`
- `CLI` = `cd onecgiar-pr-client && npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern=`

## 2. Pre-flight checklist

- [x] `requirements.md` approved (2026-10-16). GLF-OQ-1..6 at defaults; R-5 and R-8 amended in Phase 2.
- [x] `design.md` approved (2026-10-16).
- [x] Family dependencies #1–#5, #7, #8, #10 are `done`.
- [x] No migration; no change to `AllResultsByRoleUserAndInitiativeFiltered`.
- [ ] No other session is editing `portfolio-overview/` or `results-framework-reporting.*` when execution starts.

## 3. Task list

### [x] GLF-T-1 — Server: `GET portfolio/result-dimensions`

- **Type:** server
- **Description:** Add the endpoint end to end, following #8's `portfolio/bilateral-projects`:
  - **Repository:** a new `ResultRepository.getPortfolioResultDimensions(versionId)`. It runs four bound-parameter statements (design §5):
    - `DISTINCT (r.id, rbp.project_id)`
    - `DISTINCT (r.id, rc.center_id)`
    - project labels
    - Center labels (with institution acronym and name)

    The result scope in every statement is `r.version_id = ?`, `r.is_active = 1`, `r.result_type_id NOT IN (10, 11)`, and every link is active. `w3ProjectIds` is the set of projects with ≥ 1 linked result where `source = 'API'`.
  - **Service:** `getPortfolioResultDimensions(versionId?)`.
    - It reuses `resolveReportingVersion` (404 when unresolved).
    - It shapes the positional pairs and keeps a Center code that has no catalogue row, labelled by its code.
    - Any other error returns a generic 500, and the log carries the error code only.
  - **Controller:** a handler with `@Roles(ADMIN, APPLICATION)` + `ValidRoleGuard`, the same `versionId` coercion as #8, and Swagger.
  - **DTO:** `dto/portfolio-result-dimensions.dto.ts`.
- **Implements:**
  - GLF-R-11 (1)–(4).
  - S-11.1 THEN: one pair per Center, through `DISTINCT`. AND IT MUST: no inactive rows.
  - S-11.2: no `GROUP_CONCAT`, so no truncation.
  - GLF-R-12: guard and role metadata.
  - NFR Security: bound parameters; no SQL in the body or the log.
  - Design DD-1, DD-3, §4, §5.
- **Files:** `onecgiar-pr-server/src/api/results/result.repository.ts` (+ spec), `…/results-framework-reporting.service.ts` (+ spec), `…/results-framework-reporting.controller.ts` (+ spec), `…/dto/portfolio-result-dimensions.dto.ts` (new).
- **Depends on:** —
- **Blocks:** GLF-T-8
- **Parallel-safe:** yes with GLF-T-2..T-7. Server only; the client codes against the interface in design §4.1.
- **Estimate:** M
- **Review:** full (new API surface, auth)
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`
- **Verification:**
  - **Falsifier:** each of these makes a spec fail:
    - Repository spec (data source mocked):
      - a missing `DISTINCT` in either pair query;
      - any `GROUP_CONCAT` or `${…}` in the SQL;
      - a missing `rc.is_active`, `rbp.is_active` or `r.is_active` predicate;
      - a missing `NOT IN (10, 11)` exclusion;
      - for version 7, a bind array other than `[7]` in each pair statement.
    - Service spec:
      - `(99)` not returning 404;
      - a Center code `CENTER-99` missing from the catalogue being dropped instead of kept with its code as the label;
      - a thrown DB error whose SQL text reaches the response body or `Logger.error`.
    - Controller spec:
      - the guard metadata not equal to `[ValidRoleGuard]`;
      - the role not `{ ADMIN, APPLICATION }`;
      - the coercion table (`'7'` → 7; `''`, `'  '`, `'abc'`, `'0'`, `'-3'`, `undefined` → `undefined`) not holding.
  - **Red run:** `SRV"result\.repository\.spec|results-framework-reporting\.(service|controller)\.spec"`. It fails before the method exists and passes after.
  - **Disqualifier:** these are **presence assertions on SQL text and metadata**. They cannot prove the pairs are right or that a non-admin gets 403; GLF-T-8 proves both live. If a spec needs the real DB to pass, the test is wrong, not the code. Stop and report.
  - **Consumers:** none (no shared symbol changed). `AllResultsByRoleUserAndInitiativeFiltered` must show **no diff**: `git diff -U0` on `result.repository.ts` touches only lines of the new method.
- **Definition of done:**
  - [ ] Red run green; eslint clean on the touched files.
  - [ ] Swagger documents the route, query and response.
  - [ ] No SQL text in errors or logs (`.cursorrules`, `65e70258f`).

### [x] GLF-T-2 — Client: wire types, API method and pure filter logic

- **Type:** client
- **Description:**
  - Add `shared/interfaces/portfolio-result-dimensions.interface.ts` and `ResultsApiService.GET_PortfolioResultDimensions(versionId?)`, the same shape as `GET_PortfolioBilateralProjects`.
  - Create `portfolio-overview/services/portfolio-filters.ts` with every export in design §6.2:
    - the selection type and helpers;
    - `buildDimensionIndex`;
    - `matchesRow`, with a tri-state result: match / miss / unknown;
    - `buildOptions`;
    - `sanitize`;
    - `parseQueryParams` / `toQueryParams`;
    - `SECTION_HONOURS`;
    - `notAffectedBy`;
    - `resultsCenterLinkable`.

  The level comes from `typology.aggregate.ts` `levelOf`, imported, not copied. Status slots come from `resolveStatusSlot`, imported.
- **Implements:**
  - GLF-R-2: S-2.1 (AND/OR), S-2.2 (contributing Center; BUT an inactive link does not match, since the index only holds active pairs from T-1), S-2.3 (any-source project), S-2.4 (level expands; BUT unclassified needs its own token).
  - GLF-R-3: S-3.1 THEN and BUT. The option order and labels from the R-3 table.
  - GLF-R-5: the link rule, including S-5.2 BUT (Center present) and AND (two statuses).
  - GLF-R-9: S-9.1, the pure list.
  - GLF-R-13: "unknown" when the index is missing (S-13.1 BUT).
  - GLF-R-14: the codec and S-14.1 sanitizing (`ZZ99` dropped).
  - Design DD-2, DD-5, DD-11.
- **Files:** `onecgiar-pr-client/src/app/shared/interfaces/portfolio-result-dimensions.interface.ts` (new), `…/shared/services/api/results-api.service.ts` (+ spec), `…/portfolio-overview/services/portfolio-filters.ts` (+ `.spec.ts`, new).
- **Depends on:** —
- **Blocks:** GLF-T-3, GLF-T-6, GLF-T-7
- **Estimate:** M
- **Review:** full (the matching rule every figure depends on)
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:** the spec fixtures are R1–R3 of S-2.1 plus R4/R5 of S-2.3. Each of these fails:
    - the matcher using OR across dimensions (R3 matches);
    - the matcher matching a Center through `lead_center` (an R2 fixture with `lead_center: 'ILRI'` and an index entry for CIAT must match CIAT);
    - Typology `output` not matching a row of type "Knowledge product";
    - a missing index returning `false` instead of `unknown`;
    - `buildOptions` listing project Q, linked only to W1/W2;
    - `notAffectedBy('toc', {center, status})` not equal to `['center', 'status']` in bar order;
    - `resultsCenterLinkable` true with two statuses;
    - `parseQueryParams('?program=SP02,ZZ99&status=editing')` followed by `sanitize` keeping `ZZ99`;
    - the codec round-trip changing a type name containing a comma or a space.
  - **Red run:** `CLI"portfolio-filters\.spec|results-api\.service\.spec"`. It fails before the file exists.
  - **Disqualifier:** if `levelOf` or `resolveStatusSlot` cannot be imported without pulling a component into the pure file, stop and escalate. Copying the maps is not allowed, because two maps drift.
  - **Consumers:** `results-api.service.ts` gains one method only. No existing method changes.
- **Definition of done:**
  - [ ] Red run green; eslint clean on the touched files.
  - [ ] The file has no Angular imports beyond types (pure).

### [x] GLF-T-3 — Client: service state, `filteredRows` and the aggregations moved

- **Type:** client
- **Description:** In `PortfolioOverviewService`:
  - Widen `RawResult` with `id`, `title` and `result_level_name`.
  - Add the `selection` signal, the mutators, the `dimensions` state with `loadDimensions()` (a request token; called after `apply()` and by Retry), `dimensionsNotice`, `dimensionIndex`, `options`, `filtersPending`, `filteredRows` and `filteredTotal`.
  - Move **every** figure computed onto `filteredRows()`, in one change (DD-6).
  - Keep `total`, `versionId`, `phaseName`, `closedPhase`, `fetchedCount`, `isPartial` and `openRows` on the unfiltered rows.
  - On a map failure, drop any Project or Center selection and set `dimensionsNotice`.
- **Implements:**
  - GLF-R-4: S-4.1, all three equalities plus the reconciliation AND.
  - GLF-R-13: one request per load, plus one per Retry; pending while loading; drop + notice on failure (S-13.1 THEN, BUT).
  - GLF-R-15: guards on unfiltered rows.
  - Design §6.3, DD-4, DD-5, DD-6.
- **Files:** `…/portfolio-overview/services/portfolio-overview.service.ts` (+ spec).
- **Depends on:** GLF-T-2
- **Blocks:** GLF-T-4, GLF-T-5
- **Estimate:** M
- **Review:** full (shared state for the whole page)
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:** each of these fails:
    - With `selection.status = {editing}` on a fixture of 10 rows (4 Editing): `kpiTotals().totalResults`, the sum of `statusSegments()` counts and `filteredTotal()` must all be 4, and `kpiTotals()` New + Replicated must equal 4. A computed left on `rows()` gives 10.
    - `total()` must stay 10, and `fetchedCount()` / `isPartial()` must be unchanged.
    - The map request must be issued exactly once after load, and once more per `retryDimensions()`. A superseded response (an older token) must be ignored.
    - With `selection.center = {CENTER-03}` and the map pending, `filtersPending()` must be true. After a failing map, the center selection must be empty and `dimensionsNotice()` set.
  - **Red run:** `CLI"portfolio-overview\.service\.spec"`.
  - **Disqualifier:** a failing assertion on an **unchanged** existing service case means the move altered an unfiltered figure. Stop; do not edit the old expectation to match.
  - **Consumers:** the page component and the typology block (they read `openRows` / aggregations). Re-run `CLI"portfolio-overview\.component\.spec|typology-block"` and report any failure verbatim. Fixing them is GLF-T-5's scope.
- **Definition of done:**
  - [ ] Red run green; the existing service cases unchanged and green.
  - [ ] eslint clean on the touched files.

### [x] GLF-T-4 — Client: filter bar and multi-select

- **Type:** client
- **Description:** Create `components/filter-bar/` per design §6.4:
  - `filter-multi-select`: Spartan Popover + Command; optional search; optional level groups; disabled with a hint; ARIA.
  - `filter-bar`: 5 controls in bar order; chips with "Remove <value>"; **Clear all** only when something is active; the count "N of M results" / "M results" in a polite live region; the map loading / unavailable line with Retry; the dropped-selection notice; a "Filters (n)" button opening a Spartan Sheet below 768 px.

  Add the `filters` copy group. Declare any new Helm host-directive input in `tests/mocks/spartanBrainMock.ts`.
- **Implements:**
  - GLF-R-1: S-1.1 THEN, AND (count), BUT (no chips or Clear all when nothing is selected).
  - GLF-R-3: the controls render `options()`, with search on Project and Center.
  - GLF-R-13: the table (Project/Center disabled while loading or failed; Retry; the other three enabled).
  - NFR Accessibility: names, live region. NFR Responsive: the sheet trigger.
  - Design §6.4, §6.7, DD-10.
- **Files:** `…/portfolio-overview/components/filter-bar/*` (new, + specs), `…/internationalization/portfolio-overview.copy.ts`, `onecgiar-pr-client/tests/mocks/spartanBrainMock.ts` (only if needed).
- **Depends on:** GLF-T-3
- **Blocks:** GLF-T-5
- **Estimate:** L
- **Review:** checklist
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`, `frontend-design`
- **Verification:**
  - **Falsifier:** each of these fails:
    - With `center = {CENTER-03}` and 1,284 of 6,094 filtered: no chip labelled "CIAT"; the count text not "1,284 of 6,094 results"; or the remove button lacking `aria-label="Remove CIAT"`.
    - With nothing selected: **Clear all** rendered.
    - With the map state `error`: the Project or Center trigger not `disabled`, the Program trigger disabled, or Retry not calling `retryDimensions` once.
    - Selecting the Outcome group item not adding the `outcome` token.
  - **Red run:** `CLI"filter-bar|filter-multi-select"`.
  - **Disqualifier:** jsdom proves **presence and wiring only**. It cannot prove that the bar wraps, that the sheet appears at 375 px, or the focus order; those are GLF-T-8 browser checks. An NG0311 in any page spec means a mock is missing. Fix the mock, never the template input.
  - **Consumers:** `spartanBrainMock.ts` is shared by every client spec. If it changes, re-run `CLI"portfolio-overview|centers-block|global-search"` and report the outcome.
- **Definition of done:**
  - [ ] Red run green; eslint clean.
  - [ ] Every string in the copy file; tokens only (`var(--pr-*)`), no new colours.

### [x] GLF-T-5 — Client: page wiring, status tiles, URL sync and docs

- **Type:** client
- **Description:** In `portfolio-overview.component.{ts,html}`:
  - Mount the bar inside `hasFigures()` above the deck.
  - Add the sub-switch pending skeletons / no-match panel / sections for the deck, status and typology. Keep the ToC KPI block outside the sub-switch.
  - Make tiles and the donut call `toggleValue('status', key)`, with `aria-pressed` from the selection.
  - Remove `selectedStatusFilter` / `toggleStatusFilter` (DD-7).
  - Make the strip show when any dimension is active, with **View in Results Center** gated by `resultsCenterLinkable`.
  - Read the query params once, apply them through `sanitize` (Project and Center after the map), and write back with `replaceUrl`, preserving other params.
  - Pass the block inputs per design §6.5: typology gets `filteredRows()`.
  - Rewrite the page spec cases that asserted the old strip.
  - Update `portfolio-overview/CLAUDE.md` (a filters section; DD-7 "do not re-add a local status highlight"; the typology Center view is lead-only by design) and re-stamp it.
- **Implements:**
  - GLF-R-1: render gating (not while loading, on error, or phase-empty).
  - GLF-R-5: S-5.1 THEN, AND (click again clears). S-5.2 THEN, BUT, AND (two statuses).
  - GLF-R-10: S-10.1 THEN, AND (ToC still lists SP05), BUT (no phase-empty state).
  - GLF-R-13: S-13.1, sections skeleton while pending.
  - GLF-R-14: S-14.1 THEN, AND (`ZZ99` removed from the URL), AND IT MUST (`replaceUrl`, no history entry).
  - GLF-R-15: the closed-phase and partial banners unchanged under a filter.
  - Design §6.5, DD-7, DD-11.
- **Files:** `…/portfolio-overview/portfolio-overview.component.{ts,html}` (+ spec), `…/portfolio-overview/CLAUDE.md`.
- **Depends on:** GLF-T-3, GLF-T-4, GLF-T-6, GLF-T-7 (the block inputs must exist)
- **Blocks:** GLF-T-8
- **Estimate:** L
- **Review:** full (reversion DD-7; page-wide wiring)
- **Skills:** `angular-developer`, `spartan`
- **Verification:**
  - **Falsifier:** each of these fails:
    - Clicking the Editing tile and `selection().status` not being `{editing}`, or the deck total not equal to the Editing count. A second click not clearing it.
    - `?program=SP02,ZZ99&status=editing` restoring anything but `{SP02}` / `{editing}`, or `router.navigate` called without `replaceUrl: true`, or an unrelated param `foo=1` lost.
    - With `program = {SP05}` and `status = {rejected}` and no matching rows: the no-match panel absent, `app-portfolio-toc-kpi-block` absent, or the phase-empty text present.
    - The strip "Active filter: all" text appearing with nothing selected.
    - **View in Results Center** visible with Center active, or with two statuses.
    - `portfolio-overview-skeleton-typology` not shown while a center selection is pending.
  - **Red run:** `CLI"portfolio-overview\.component\.spec"`.
  - **Disqualifier:** deleting or weakening an existing assertion is allowed only where it asserted `selectedStatusFilter` behaviour (DD-7 #1). Any other changed expectation stops the task. List each removed assertion in the report.
  - **Consumers:** `navigateToResultsCenter` (signature unchanged), the typology block input, and `selectedStatusFilter` / `toggleStatusFilter` (removed). Grep the client for both names. Zero hits outside this component and its spec is required.
- **Definition of done:**
  - [ ] Red run green, plus `CLI"typology-block|toc-kpi-block|projects-block|centers-block"` green (memory: run the affected specs before commit).
  - [ ] eslint clean; `CLAUDE.md` updated and re-stamped in the same commit.

### [x] GLF-T-6 — Client: ToC KPI and Projects blocks narrow by selection

- **Type:** client
- **Description:**
  - **ToC KPI:** add the inputs `programs` and `notAffected`. Visible rows are filtered by code. While programs are set, the summary is the sum of the visible rows; otherwise it is the server portfolio. The empty rule applies to the visible rows.
  - **Projects:** add the inputs `programs`, `centers` and `notAffected`. Filter By P/A and By Center. Hide Unassigned while centers are set. Add the caption "Totals cover the whole portfolio" while either is set; the KPI figures are unchanged.
  - Both blocks render the "Not affected by" line. Their fetch effects stay on `versionId` only.
- **Implements:**
  - GLF-R-6: S-6.1 THEN, AND, AND IT MUST (no new request).
  - GLF-R-7: S-7.1 THEN, AND; plus the R-7 bullets (By P/A, Unassigned hidden, no refetch).
  - GLF-R-9: rendering for these two sections.
  - Design §6.6, DD-8.
- **Files:** `…/components/toc-kpi-block/*` (component, `toc-kpi.format.ts`, specs), `…/components/projects-block/*` (component, `projects.format.ts`, specs).
- **Depends on:** GLF-T-2
- **Blocks:** GLF-T-5
- **Parallel-safe:** yes with GLF-T-7 (disjoint folders). Tests run one at a time.
- **Estimate:** M
- **Review:** checklist
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:** each of these fails:
    - ToC with SP01 10/40, SP02 5/10, SP03 1/5 and `programs = {SP01, SP02}`: rows other than SP01 and SP02, or a summary not equal to 15/50 (30%).
    - Changing `programs` triggering a second `portfolio-coverage` request (`HttpTestingController.match` count ≠ 1).
    - Projects with `centers = {CENTER-03}`: an Unassigned row present, a non-CIAT row present, totals different from the response, or the caption missing.
    - `notAffected = ['status']`: no "Not affected by: Status" text.
  - **Red run:** `CLI"toc-kpi|projects-block|projects\.format"`.
  - **Disqualifier:** if the summary sum differs from the server portfolio total **with no filter**, then P-5 is false. Stop and escalate; do not special-case it.
  - **Consumers:** the page template (inputs are optional with empty defaults, so the current mount still compiles before GLF-T-5).
- **Definition of done:**
  - [ ] Red run green; eslint clean; new strings in the copy file.

### [x] GLF-T-7 — Client: Centers block applies the global selection

- **Type:** client
- **Description:**
  - Add a pure `applyGlobal(rows, selection, index, honoursProject)` to `centers-block.aggregate.ts`: typology via `levelOf`, status via `resolveStatusSlot`, project via the index by `row.id`, program via `submitter`.
  - In the component, add the inputs `selection`, `dimensionIndex` and `dimensionsVersionId`. The Center selection limits the states that feed `viewRows`, `kpis` and `centersCount`.
  - The order is global, then origin, then status tile (DD-9). `kpis()` reads the globally filtered rows and ignores the origin. Project is honoured only when the block's version equals `dimensionsVersionId`; otherwise the "Not affected by" line lists Project.
  - Request behaviour is unchanged.
- **Implements:**
  - GLF-R-8: S-8.1 THEN, AND, AND (origin does not move the KPI cards). S-8.2 THEN, AND (Centers reporting out of the selected).
  - The R-8 Project rule: map-based, and not honoured between cycles.
  - GLF-R-9: rendering for this section.
  - Design §6.6, DD-9.
- **Files:** `…/components/centers-block/centers-block.component.{ts,html}`, `centers-block.aggregate.ts` (+ specs), `…/internationalization/portfolio-centers-block.copy.ts`.
- **Depends on:** GLF-T-2
- **Blocks:** GLF-T-5
- **Parallel-safe:** yes with GLF-T-6.
- **Estimate:** M
- **Review:** full (composes with the shipped DD-4 rule)
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:** each of these fails:
    - `typology = {output}`: any non-Output row counted, or New + Replicated ≠ the block total.
    - Selecting the local origin "replicated": any change in `kpis()`.
    - `center = {CENTER-03, CENTER-11}` over 15 Centers: `viewRows` with other codes, or "Centers reporting" denominator ≠ 2.
    - The block version ≠ `dimensionsVersionId` with `project = {P}`: rows filtered by project instead of "Not affected by: Project" being shown.
    - The number of `GET_bilateralCenterResults` calls changing with the selection.
  - **Red run:** `CLI"centers-block"`.
  - **Disqualifier:** any existing DD-4 case that must change its expectation means the composition order is wrong. Stop and report; do not edit the case.
  - **Consumers:** `centers-block.aggregate.ts` exports used only inside the block (scout). Confirm with a grep before editing.
- **Definition of done:**
  - [ ] Red run green, existing cases unchanged; eslint clean; strings in the copy file.

### [x] GLF-T-8 — HITL verification and family bookkeeping

- **Type:** rollout
- **Description:** With the user, on the local stack (read-only; never click write buttons; memory "browser checks hit shared prdb"):
  1. **Index check:** `SHOW INDEX FROM results_center` and `SHOW INDEX FROM results_by_projects`. The user runs both (P-11).
  2. **Endpoint:**
     - 3 timed calls: report p95 and the spread.
     - Response size (P-12).
     - One non-admin call, which must be 403.
  3. **Parity:** the user runs an independent SQL count of distinct result ids for (a) Center = CIAT (lead or contributing, active) and (b) one W3 project, on the open version. Compare with the page's filtered KPI total.
  4. **Browser at 1280 / 768 / 375:**
     - bar wrap, the sheet at 375, chips, keyboard-only use of one multi-select;
     - no horizontal scroll;
     - the "Not affected by" lines;
     - the no-match panel;
     - a reload with params, then the back button (no filter history).
  5. **Client recompute time:** 5 runs of one selection change in the performance panel; report the median and the spread.
  6. Update the family manifest status and change log on PASS.
- **Implements:**
  - NFR performance, parity, security, responsive and accessibility.
  - GLF-R-11 S-11.1 / S-11.2 live, GLF-R-12 live, S-14.1 "no history entry" live.
  - Requirements §8: the rows marked "No automated gate" and "jsdom cannot".
- **Files:** `docs/specs/changes/portfolio-overview-revamp/family.md` (status row and log only).
- **Depends on:** GLF-T-1, GLF-T-5
- **Blocks:** —
- **Estimate:** S
- **Review:** checklist
- **Skills:** `playwright-cli` if installed, else a manual check by the user
- **Verification:**
  - **Falsifier:**
    - Parity: a page total ≠ the SQL count of **distinct** result ids.
    - A non-admin response other than 403.
    - p95 > 3 s.
    - A payload > 4 MB.
    - Any horizontal scroll at 375.
    - The back button stepping through filter states.
  - **Red run:** n/a (no test gate).
  - **Disqualifier:**
    - If the 3 timings spread by more than 1 s, the p95 is not evidence: report the spread and re-measure, do not pass.
    - If parity differs by exactly the duplicate-lead rows (P-2), record a follow-up rather than failing this spec.
    - Any other parity gap stops execution.
  - **Consumers:** none (no shared symbol changed).
- **Definition of done:**
  - [ ] Every check reported verbatim, with the user's acceptance.
  - [ ] Family #6 set to `done` only after the user accepts.

## 4. Dependency graph

```
GLF-T-1 (server) ─────────────────────────────────────────┐
GLF-T-2 (types + pure logic)                              │
   ├── GLF-T-3 (service) ── GLF-T-4 (filter bar) ──┐      │
   ├── GLF-T-6 (ToC + Projects) ── parallel ───────┤      │
   └── GLF-T-7 (Centers) ───────── parallel ───────┤      │
                                                   └── GLF-T-5 (page + docs)
                                                              └── GLF-T-8 (HITL) ◄┘
```

- **Parallel-friendly:**
  - T-1 with T-2..T-7: server and client.
  - T-6 with T-7: disjoint folders.
  - T-4 with T-6 and T-7, after T-3.
- **Test runs stay serial** (machine rule).

## 5. Scenario & clause coverage

| Requirement · scenario / clause | Owning task |
|---|---|
| R-1 · S-1.1 THEN / AND count / BUT empty | T-4 |
| R-1 · bar not rendered while loading, on error, or phase-empty | T-5 |
| R-2 · S-2.1, S-2.2 (THEN + BUT inactive), S-2.3 (THEN + AND IT MUST inactive), S-2.4 (THEN + BUT unclassified) | T-2 (logic). The inactive exclusion at source is T-1 |
| R-3 · option sources, order, labels; S-3.1 THEN + BUT | T-2 (data); T-4 (render + search) |
| R-4 · S-4.1 THEN + AND ×2 + reconciliation | T-3 |
| R-5 · S-5.1 THEN + AND; S-5.2 THEN + BUT + AND | T-2 (rule); T-5 (UI) |
| R-6 · S-6.1 THEN + AND + AND IT MUST no request | T-6 |
| R-7 · S-7.1 THEN + AND; By P/A narrowing; Unassigned hidden; no refetch | T-6 |
| R-8 · S-8.1 THEN + AND + AND origin; S-8.2 THEN + AND; Project between cycles | T-7 |
| R-9 · S-9.1 THEN + AND + BUT | T-2 (list); T-5 / T-6 / T-7 (render) |
| R-10 · S-10.1 THEN + AND + BUT | T-5 |
| R-11 · (1)–(4), S-11.1 THEN + AND IT MUST, S-11.2 | T-1 (presence); T-8 (live) |
| R-12 · JWT + Admin, 403, not exempt | T-1 (metadata); T-8 (live 403) |
| R-13 · loading / failed / loaded table; pending skeleton; drop + notice; S-13.1 THEN + AND + BUT | T-3 (state); T-4 (controls); T-5 (skeleton); T-2 (unknown) |
| R-14 · S-14.1 THEN + AND + AND IT MUST | T-2 (codec); T-5 (router); T-8 (back button live) |
| R-15 · phase and partial guards | T-3 (values); T-5 (banners) |
| NFRs (performance, parity, a11y, responsive, security, docs) | T-1, T-4, T-5, T-8 |

## 6. Rollout & verification

- **PR 1 (server):** T-1. It is safe to deploy alone, because the page ignores the endpoint until PR 2.
- **PR 2 (client):** T-2..T-7. The page degrades gracefully if PR 1 is not yet deployed: Project and Center are unavailable (R-13).
- **PRTest smoke** after both PRs reach `performance-refactor` (memory: about 30 min deploy): one Center filter, one reload with params, and a non-admin 403.

## 7. Cleanup & follow-ups

- Duplicate page rows for results with two lead Centers (P-2): a follow-up if parity shows them.
- #9 `filtered-detail-export` can start once T-3 is committed.

## 8. Roll-back plan

Revert PR 2, then PR 1. There is no data or migration to undo.
