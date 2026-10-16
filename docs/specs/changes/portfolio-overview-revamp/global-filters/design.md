# Design — Portfolio Overview: global filters

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/global-filters/` |
| Requirements | [`requirements.md`](./requirements.md) (approved 2026-10-16; GLF-R-5 and R-8 amended during Phase 2, see §13) |
| Depth | Full |
| Approval Mode | gated |
| Status | approved (2026-10-16, Phase 2 gate; user chose Continue, no Judgment Day) |
| Prefix | `GLF-DD-n` decisions · `GLF-P-n` premises |
| Baseline | `docs/prd.md` US-P1 / AC-3 / AC-5 · `docs/ux-ui/design.md` §7 (tokens), §10 (a11y) · `docs/trd/trd.md` §1B |
| Kaizen | `docs/specs/kaizen-log.md` does not exist. Family lessons applied: scoped Jest with `--maxWorkers=2`; `CLAUDE.md` re-stamp in the same commit; browser check at 375 / 768 / 1280; parity SQL run by the user; never log query text (`65e70258f`); declare every Helm input in `spartanBrainMock` (NG0311) |
| Sibling templates | #8 `w3-projects-section` for the endpoint (guard, coercion, version resolver, envelope, error handling); #4 `typology-view` for the type→level map |

## 1. Summary

- **Server:** one admin-only endpoint, `GET results-framework-reporting/portfolio/result-dimensions?versionId=`.
  - Two `SELECT DISTINCT` statements return (result, project) and (result, Center) pairs for one version, plus their labels.
  - It uses **no `GROUP_CONCAT`**, so nothing can be truncated (GLF-R-11, proposal R-4).
- **Client, state:** the filter selection and the dimensions map live in `PortfolioOverviewService`, which the page already provides.
  - One computed, `filteredRows()`, feeds every row-driven figure.
  - Matching, options, URL parsing and the "Not affected by" list are **pure functions** in one new file. That file is the unit-test seam.
- **Client, UI:** a new `components/filter-bar/` built from the Spartan primitives already installed: Popover + Command for each multi-select, Sheet for 375 px.
  - Spartan has **no Select component** in this repo (GLF-P-6).
- **Blocks:**
  - Typology gets `filteredRows()`.
  - ToC KPI and Projects get small selection inputs and narrow the rows they already hold. **No refetch.**
  - Centers gets the selection plus the map and filters its own rows.

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| GLF-P-1 | Page rows carry `id` = `r.id` | `result.repository.ts:707` (scout) | Read | verified | — |
| GLF-P-2 | Page rows carry only the **lead** Center, as an acronym (`lead_center`, `:759`). Its left join can repeat a row when a result has two active lead rows (SR-164368, `:4264`) | `result.repository.ts:759, 775-780` | Read | verified | Center matching never uses `lead_center` (DD-2). Duplicates are out of scope (requirements §9) |
| GLF-P-3 | `ResultRepository` is already injected in `ResultsFrameworkReportingService` (`:76`), and the version resolver `resolveReportingVersion` (`:1175-1215`) is reusable | Service constructor | Read | verified | — |
| GLF-P-4 | `results_center.center_id` is the CLARISA Center code (FK to `clarisa_center.code`). The Centers block requests and keys its rows by the same code | Entity + `bilateral-context.service.ts:8-10` (scouts) | Read | verified | — |
| GLF-P-5 | The ToC portfolio summary is the **sum** of the P/A rows (`addCounts(portfolio, …)` per P/A, service `:950-958`). So a subset summary = the sum of the selected rows | Service code | Read | verified | — |
| GLF-P-6 | Installed Spartan Helm: popover, command, sheet, checkbox, badge, button, separator, tooltip, … **No select or combobox.** `spartanBrainMock` already mocks BrnPopover*, BrnCommand*, BrnSheet* | `src/app/spartan/`, `tests/mocks/spartanBrainMock.ts` (scout) | Read | verified | — |
| GLF-P-7 | The page-local `selectedStatusFilter` filters no data. It only highlights a tile and shows a strip, and the strip always renders because `'all'` is truthy | `portfolio-overview.component.ts:173-175`, html `:296-356` (scout) | Read | verified | — |
| GLF-P-8 | The Results Center takes one status id and puts `program` into its free-text search (`navigateToResultsCenter`, ts `:229-282`) | Code | Read | verified | Requirement GLF-R-5 amended: at most one Program and one Status |
| GLF-P-9 | The Centers block resolves its own phase (open P25) and its rows carry `id`, `submitter`, `project_id` (lead only), `result_type` and `status_id`. They do not carry the level or the lead Center | Centers block, `bilateral-center-result.interface.ts` (scout) | Read | verified | — |
| GLF-P-10 | `JSON_ARRAYAGG` exists in prod SQL (`result.repository.ts:4023`), so MySQL ≥ 5.7.22. This design does not need it | Scout | Read | verified | — |
| GLF-P-11 | `results_center(result_id)` and `results_by_projects(result_id)` are indexed (at least FK indexes) | Entities have no explicit `@Index` | Not verified | **assumed** | GLF-T-8 runs `SHOW INDEX` on both before timing. If either is missing, apply the §8 fallback |
| GLF-P-12 | The response size is acceptable: ≈ 20k results × ≈ 1.5 Center links + ≈ 0.5 project links ≈ 40k pairs, about 0.8 MB of JSON before compression. This is under the Lambda response limit (6 MB) | Estimate | Not verified | **assumed** | GLF-T-8 records the real size. Above 4 MB, stop and escalate (the fallback is to drop W1/W2 project links) |

## 2. Architecture Overview

### 2.1 Where this lives

| Layer | Path | Change |
|---|---|---|
| Server controller | `api/results-framework-reporting/results-framework-reporting.controller.ts` | New handler, a copy of the `portfolio/bilateral-projects` posture (guard, coercion, Swagger) |
| Server service | `…/results-framework-reporting.service.ts` | New `getPortfolioResultDimensions(versionId?)` |
| Server repository | `api/results/result.repository.ts` | New method returning the two pair lists and the labels. **`AllResultsByRoleUserAndInitiativeFiltered` is not touched** |
| Server DTO | `…/dto/portfolio-result-dimensions.dto.ts` (new) | Swagger response |
| Client API | `shared/services/api/results-api.service.ts` | `GET_PortfolioResultDimensions(versionId?)`, same shape as `GET_PortfolioBilateralProjects` |
| Client interface | `shared/interfaces/portfolio-result-dimensions.interface.ts` (new) | Wire types |
| Client pure logic | `portfolio-overview/services/portfolio-filters.ts` (new) | Selection type, matcher, options, URL codec, honours matrix, "not affected" list |
| Client service | `portfolio-overview/services/portfolio-overview.service.ts` | Selection signal, map state, `filteredRows`, the aggregations moved onto the filtered rows, `RawResult` widened |
| Client UI | `portfolio-overview/components/filter-bar/` (new) | `filter-bar.component` + `filter-multi-select.component` |
| Client page | `portfolio-overview.component.{ts,html}` | Mount the bar; URL sync; status tiles → global Status; no-match state; pass inputs to blocks; remove `selectedStatusFilter` |
| Blocks | `typology-block` (input only), `toc-kpi-block`, `projects-block`, `centers-block` (+ `centers-block.aggregate.ts`) | Selection inputs, narrowing, a "Not affected by" line |
| Copy / docs | `internationalization/portfolio-overview.copy.ts` (new `filters` group), `portfolio-centers-block.copy.ts`, `portfolio-overview/CLAUDE.md` | |

### 2.2 Flow

1. The page constructor calls `data.load()` (unchanged).
2. When the rows resolve, the service requests the dimensions map **once** for `versionId()` (DD-4).
3. The page reads the query params once and hands them to the service, which sanitizes them against the options.
   - Program, Typology and Status are sanitized as soon as the rows exist.
   - Project and Center are sanitized when the map arrives, or dropped if it fails.
4. Each change to the selection recomputes `filteredRows()` and, through signals, every row-driven figure. The blocks re-derive from their inputs, with no HTTP.
5. An effect in the page writes the selection back to the URL with `replaceUrl`.

## 3. Data Model Changes

No entities and no migrations.

The read touches `result`, `results_by_projects`, `results_center`, `clarisa_projects`, `clarisa_center` and `clarisa_institutions`, through bound parameters only.

## 4. API Surface

### 4.1 `GET /api/results-framework-reporting/portfolio/result-dimensions`

| Item | Value |
|---|---|
| Query | `versionId` (optional; coerced exactly as `portfolio/bilateral-projects`) |
| Auth | JWT (middleware) + `@Roles(ADMIN, APPLICATION)` + `ValidRoleGuard` (GLF-R-12) |
| Envelope | `ResponseInterceptor` `{ response, statusCode, message, … }` |
| 404 | No version can be resolved (same resolver and message style as #8) |
| 500 | Generic message. The log carries the error code only, never SQL text |

**Response:**

| Field | Contents |
|---|---|
| `versionId`, `phaseName` | The resolved version |
| `projectLinks` | Pairs `[resultId, projectId]` |
| `centerLinks` | Pairs `[resultId, centerCode]` |
| `projects` | `{ id, shortName, fullName }` |
| `centers` | `{ code, acronym, name }` |
| `w3ProjectIds` | Project ids linked to ≥ 1 W3 result (GLF-R-3 options, OQ-1) |

The pairs are positional, to keep the payload small (P-12).

### 4.2 Bilateral / platform-report impact

None. The route is under `results-framework-reporting`, not `/api/bilateral/*` or `/api/platform-report/*`, so it is not JWT-exempt.

## 5. Server Workflow / Business Rules

1. Resolve the version with `resolveReportingVersion(versionId)`, the #8 resolver: a closed phase is accepted, with fallback to open, then newest.
2. **Result scope:** `r.version_id = ?`, `r.is_active = 1`, and `r.result_type_id NOT IN (10, 11)`, the same exclusions as the page rows.
   - It does **not** join `results_by_inititiative`. Extra ids that the page does not hold are harmless, because the client joins by id.
3. **Project pairs:** `SELECT DISTINCT` over active `results_by_projects` rows of in-scope results. A second flag query (or a `MAX(r.source = 'API')` per project) yields `w3ProjectIds`.
4. **Center pairs:** `SELECT DISTINCT r.id, rc.center_id` over active `results_center` rows. `DISTINCT` removes the SR-164368 duplicates (S-11.1). Lead and contributing rows both count; `is_leading_result` is ignored.
5. **Labels:**
   - Projects: `clarisa_projects` by the ids found.
   - Centers: `clarisa_center` joined to `clarisa_institutions` for the acronym and name. A code with no catalogue row is kept, labelled by its code.
6. Return the envelope. Errors use `_handlersError`, as in #8.

## 6. Frontend Plan

### 6.1 Routes / modules

No route change. The page reads and writes its own query params on `/portfolio-overview`; `navigateToResultsCenter` is unchanged.

### 6.2 Pure logic — `services/portfolio-filters.ts`

| Export | Responsibility | Requirements |
|---|---|---|
| `PortfolioFilterSelection` | Five readonly sets: `program` (codes), `project` (ids as strings), `center` (codes), `typology` (tokens: a level key `output`/`outcome`/`impact`/`unclassified`, or a normalized type name), `status` (slot keys) | R-2 |
| `EMPTY_SELECTION`, `isActive`, `activeDimensions` | Helpers; dimension order = bar order | R-1, R-9 |
| `buildDimensionIndex(map)` | Turns the pairs into `resultId → Set<projectId>` and `resultId → Set<centerCode>` | R-2 |
| `matchesRow(row, selection, index)` | AND across, OR inside. Typology matches when the row's level token **or** its type token is selected. A Center or Project test with no index answers "unknown", and the caller treats that as pending (DD-5) | R-2, R-13 |
| `buildOptions(rows, map)` | The five option lists, with order and labels as in R-3. Project options are restricted to `w3ProjectIds` | R-3 |
| `sanitize(selection, options)` | Drops unknown values, per dimension | R-14 |
| `parseQueryParams` / `toQueryParams` | The URL codec: comma lists, empty dimensions omitted, type names URL-encoded | R-14 |
| `SECTION_HONOURS` | `kpi`, `status`, `typology`, `centers` → all five; `toc` → program; `projects` → program, center | R-9 |
| `notAffectedBy(section, selection, extra?)` | The active dimensions the section does not honour, in bar order. `extra` lets the Centers block add Project between cycles | R-9, R-8 |
| `resultsCenterLinkable(selection)` | True when only Program/Status are active, with ≤ 1 value each | R-5 |

The type→level map is **imported** from `typology.aggregate.ts` (`levelOf`), not copied.

### 6.3 Service — `PortfolioOverviewService`

- `RawResult` gains `id`, `title` and `result_level_name`. #9 needs `title` and `result_level_name`; this spec needs `id`.
- New signals:
  - `selection`: a `PortfolioFilterSelection`.
  - `dimensions`: `{ status: 'idle' | 'loading' | 'ready' | 'error', map }`.
  - `dimensionsNotice`: set when a URL Project or Center selection had to be dropped.
- New computeds:
  - `dimensionIndex`
  - `options`
  - `filtersPending`: Project or Center is selected and the map is not ready.
  - `filteredRows`
  - `filteredTotal`
- **All aggregations** (`kpiTotals`, `statusSegments`, `totals`, `categories`, `categoryBars`, `categoryOriginRows`, `centerDistributionRows`, `bilaterals`) move from `rows()` to `filteredRows()`.
- **Kept on `rows()` on purpose:** `total` (the page's empty and figure states), `versionId`, `phaseName`, `closedPhase`, `fetchedCount` and `isPartial` (GLF-R-15), `openRows` (options).
- `loadDimensions()` is called by `load()` once the rows are set, and by Retry. It uses a request token like `load()`, so a superseded response is ignored.
- Mutators: `setSelection`, `toggleValue(dimension, value)`, `clearDimension`, `clearAll`.

### 6.4 Filter bar — `components/filter-bar/`

| Piece | Design |
|---|---|
| `filter-multi-select` | Built from Spartan **Popover + Command**: a trigger button showing the label and the selected count; a command list with checkbox-style items; optional search input (on for Project and Center); optional groups (Typology levels, each with a "select level" item). Disabled state with a hint, for the map loading or failed. ARIA: the trigger has `aria-haspopup="listbox"` and `aria-expanded`; items use `aria-checked`, inside a list marked `aria-multiselectable`. Spartan Brain's `BrnCommandItem` already host-binds `aria-selected` to the keyboard-active row, so the chosen state cannot also use it. This was amended during execution and accepted by the user on 2026-10-16 (GLF-T-4) |
| `filter-bar` | 5 selects in a wrapping row ≥ 768 px. Below 768 px, one "Filters (n)" button opens a Spartan **Sheet** holding the same 5 selects stacked. Under the row: the chips (Spartan badge + remove button named "Remove <value>"), **Clear all**, the count "N of M results" in an `aria-live="polite"` region, the map-unavailable line with Retry, and the dropped-selection notice |
| Inputs / outputs | The bar reads the service directly (it is inside the page's provider scope). It has no inputs, which keeps the page template small |
| Tokens | Neutral surface `var(--pr-surface…)`, border `var(--pr-border…)`, chips on the existing badge variant, counts `font-mono tabular-nums`. No new colours |

### 6.5 Page

- Mount `<app-portfolio-filter-bar />` inside `hasFigures()`, above the KPI deck. It is not rendered while loading, on error, or in the phase-empty state (R-1).
- Inside `hasFigures()`:
  - While `filtersPending()`: the existing skeletons for the deck, status and typology.
  - When `filteredTotal() === 0`: one no-match panel with **Clear all** (R-10).
  - Otherwise: the current sections.
  - The ToC KPI block stays outside this sub-switch, so it renders in every case (S-10.1).
- **Status tiles and donut:**
  - `aria-pressed` and the highlight read `selection().status`.
  - A click calls `toggleValue('status', key)`.
  - `selectedStatusFilter` and `toggleStatusFilter` are removed (DD-7).
  - The "Active filter" strip shows when any dimension is active and lists the chips' text. **View in Results Center** shows only when `resultsCenterLinkable`. It passes the single status key and program code to the existing `navigateToResultsCenter`.
- **URL:** on init, read `ActivatedRoute.snapshot.queryParamMap` once and store it as pending params. An effect applies them through `sanitize` when the options exist (Project and Center after the map). A second effect writes `toQueryParams(selection)` with `router.navigate([], { queryParams, replaceUrl: true })`. Other query params are preserved.
- Block inputs:
  - typology: `[rows]="data.filteredRows()"`
  - toc-kpi: `[programs]`, `[notAffected]`
  - projects: `[programs]`, `[centers]`, `[notAffected]`
  - centers: `[selection]`, `[dimensionIndex]`, `[dimensionsVersionId]`

### 6.6 Blocks

| Block | Change |
|---|---|
| Typology | None beyond receiving filtered rows. Its Center dimension stays lead-only (#4). Copy unchanged |
| ToC KPI | New inputs `programs` (set) and `notAffected` (list). Visible rows = the rows whose code is in `programs`, or all when empty. The summary = `toSummary` of the **sum** of the visible rows (P-5) while a program filter is on; the server's portfolio counts otherwise. The empty-state rule now applies to the visible rows. The fetch effect still depends on `versionId` only (S-6.1) |
| Projects | New inputs `programs`, `centers`, `notAffected`. By P/A and By Center views filter their rows. Unassigned (`code null`) is hidden while `centers` is non-empty. KPI figures unchanged, plus a "Totals cover the whole portfolio" caption while either input is non-empty (S-7.1). The fetch depends on `versionId` only |
| Centers | New inputs `selection`, `dimensionIndex`, `dimensionsVersionId`. A new pure `applyGlobal(rows, selection, index, honoursProject)` in `centers-block.aggregate.ts` runs **before** `byOrigin` and the status tile filter. Typology uses `levelOf(row.result_type)`, status uses `resolveStatusSlot`, project uses the index by `row.id`. Center selection limits which Center states feed `viewRows`, `kpis` and `centersCount`. `kpis()` reads the globally filtered rows and still ignores the origin (DD-4 of #3). When the block's phase version ≠ `dimensionsVersionId`, project is not honoured and `notAffectedBy(…, ['project'])` says so. **Request behaviour is unchanged**: one request per Center, regardless of the Center selection, so clearing the filter needs no reload |

### 6.7 Copy

New `filters` group in `portfolio-overview.copy.ts`:
- dimension labels
- placeholders and search hints
- "Clear all"
- count template
- "Not affected by: {list}"
- "No results match these filters."
- map loading / unavailable / Retry
- dropped-selection notice
- "Totals cover the whole portfolio"
- sheet title "Filters"

Centers strings stay in `portfolio-centers-block.copy.ts`.

## 7. Security & Authorization

- The endpoint uses the same decorators as #8, so the guard is enforced on the server (AC-3). The client route keeps `CheckAdminGuard`.
- Only bound parameters. The version id is coerced in the controller.
- The response holds ids, codes and names only. No user data and no PII.
- Logs carry error codes only (`.cursorrules`, `65e70258f`).

## 8. Performance & Capacity

- **Server:** two `DISTINCT` scans driven by `result.version_id` (indexed), joined to `results_center` / `results_by_projects` by `result_id` (P-11), plus two label lookups.
  - **Budget:** p95 ≤ 3 s, from 3 timed calls at HITL.
  - **Fallback**, a pivot during execution and not pre-built: drop the W1/W2 project pairs (filter `r.source = 'API'`), or split the endpoint into two lazy calls.
- **Client:** `filteredRows` is O(rows × active dimensions) with Set lookups, and every aggregation runs once per selection change.
  - **Budget:** ≤ 150 ms for 20k rows, measured at HITL.
  - If it is slower, memoize per-row level and status-slot tokens on load. Do not add web workers.
- **Payload:** P-12. Above 4 MB, stop and escalate.

## 9. Observability

- Server: error code only, on failure, with Nest `Logger` named after the class (as #8).
- Client: none new. The map-unavailable line is the user-facing signal.

## 10. Testing Plan

| Suite | Covers |
|---|---|
| Server repository spec | SQL predicates: version and active flags, the type exclusions, `DISTINCT`, no `GROUP_CONCAT`, all values bound |
| Server service spec | Version resolution (404), pair and label shaping, unknown Center code kept, `w3ProjectIds`, generic 500 with no SQL in the body or log |
| Server controller spec | Route path, guard and role metadata, `versionId` coercion table, pass-through |
| `portfolio-filters.spec.ts` | S-2.1..S-2.4, S-3.1, S-9.1, R-5 link rule, URL codec round-trip and S-14.1 sanitising, unknown → pending |
| Service spec | S-4.1 reconciliation, guards kept on unfiltered rows (R-15), map request once and on Retry, superseded response ignored |
| Filter bar spec | Chips, Clear all, count, disabled Project/Center while loading or failed, Retry, sheet trigger at small width (logic only) |
| Page spec | Tile → global status (S-5.1, S-5.2), no-match panel (S-10.1), pending skeleton (S-13.1), URL read and write with `replaceUrl` (S-14.1), block inputs |
| ToC / Projects / Centers specs | S-6.1, S-7.1, S-8.1, S-8.2, HTTP call counts unchanged after a filter change |

All suites run scoped, with `--maxWorkers=2`. Run them one at a time and never alongside a build.

The layout, focus order and timings checks are the HITL checks in requirements §8.

## 11. Backwards Compatibility & Migration Plan

- Additive endpoint, no migration, no change to the Results Center query.
- Rollback = revert the commits. The endpoint is unused by anything else.
- The page works without the map, with the Project and Center filters disabled, so a failed deploy of only the server half degrades gracefully.

## 12. Design Decisions

### GLF-DD-1 — Client filtering + a separate dimensions endpoint
Proposal Option A.
- **Rejected:** extending the page query, because it would slow the Results Center for every user.
- **Rejected:** server filters on every endpoint, because it is about 3× the size and needs product rules that do not exist.

### GLF-DD-2 — Center and Project matching only through the map
`lead_center` is an acronym, lead-only, and can repeat rows (P-2). Using the map keeps "lead or contributing" (R-2) and joins by result id, so Centers are never matched by display names.

### GLF-DD-3 — Positional pairs and `DISTINCT`, no `GROUP_CONCAT`
`DISTINCT` removes the truncation risk (proposal R-4) and the duplicate-row risk (S-11.1) in one move, and keeps the payload small. Rejected: `JSON_ARRAYAGG`, which yields a larger payload and is harder to assert in a repository spec.

### GLF-DD-4 — One map request per page load, owned by the service
The map has the same lifetime as the rows. Rejected: lazy loading on first use of the Project or Center control, because URL restore would then need a second code path. It stays as the §8 fallback.

### GLF-DD-5 — "Unknown" is pending, never a match or a miss
While the map is loading, a Project or Center selection makes the row-driven sections show skeletons. If the map fails, those selections are dropped, with a notice (R-13). This is the only way to honour "no unfiltered figures shown as filtered".

### GLF-DD-6 — The page-level aggregations move wholesale onto `filteredRows`
Every computed that a figure reads switches over in one task, and the state and phase guards are kept on `rows()` explicitly. Splitting this across tasks would leave a window where two figures disagree (the defect S-4.1 tests for).

### GLF-DD-7 — Status tiles become the global Status filter (**reversion: removes `selectedStatusFilter`**)
The tiles stay; only the state they write moves.

**Reversion challenge — "what does removing this break?":**

| # | What it breaks | Addressed by |
|---|---|---|
| 1 | Page spec cases asserting the strip, `toggleStatusFilter` and the "Active filter" text | GLF-T-6 rewrites them against the global selection. Memory: run the affected specs before commit |
| 2 | **View in Results Center** with a status was always available before | It is still available whenever only one Status (and optionally one Program) is set, which is a superset of the old case, because the old strip held a single status (P-8) |
| 3 | The donut click handler (`onStatusChartClick`) | Kept; it calls `toggleValue` |
| 4 | The strip showing "Active filter: all" when nothing was selected | Intentionally fixed |
| 5 | Selecting a tile now changes the KPI numbers, where before it changed nothing | Intended (R-5). Recorded in `CLAUDE.md` so nobody re-adds a local highlight |

No unaddressed breakage.

### GLF-DD-8 — Aggregate blocks narrow what they already hold; no refetch
The ToC KPI and Projects blocks keep their `versionId`-only fetch. A selection change only re-derives their rows. Projects totals stay portfolio-wide and say so (OQ-6), because a multi-P/A project cannot be de-duplicated from the visible rows.

### GLF-DD-9 — The Centers block applies the global selection before its local controls
The order is `applyGlobal`, then origin, then status tile. This keeps DD-4 of #3: KPI cards read the global result and ignore the origin. The Center selection filters states in memory and never changes requests, so clearing it is instant.

### GLF-DD-10 — The multi-select is composed from Popover + Command, not a new Spartan Select
Popover and Command are installed and already mocked (P-6). Adding `brn-select` would mean a new dependency, a new mock surface, and a single-select model that does not fit the multi-select. Rejected: the legacy `pr-multi-select` custom field, which is not Spartan (memory: visual changes use Spartan).

### GLF-DD-11 — The URL is a mirror, not a source of truth
The URL is read once on init and written with `replaceUrl`. The service's signal is the only state, which avoids a read/write loop and history spam (S-14.1).

## 13. Open Gaps & Follow-ups

- **Requirements amended in Phase 2** (sweep done in `requirements.md`):
  - GLF-R-5: the link needs ≤ 1 Program and ≤ 1 Status (P-8).
  - GLF-R-8: in the Centers block, Project uses the map, and is not honoured between cycles.
  - NFR "Backwards compatibility": a new method in `result.repository.ts` is allowed.
- The page query's duplicate rows for results with two lead Centers (P-2): this spec does not fix them. Report them if parity shows them.
- The typology block's Center view stays lead-only while the global Center filter is lead-or-contributing. A CIAT filter can therefore show other lead Centers in that table. This is documented in `CLAUDE.md`, not changed.
- #9 consumes `filteredRows()` and the widened `RawResult`.

## 14. Budget (Step 2.4 tripwire)

| Measure | Expected |
|---|---|
| Tasks | 8 (server endpoint; client pure logic; service; filter bar; page wiring; ToC + Projects blocks; Centers block; HITL check + docs) |
| LOC | ≈ 1,500 added / ≈ 120 removed, tests included. Server ≈ 350, client ≈ 1,150 |
| Review rounds | ≤ 2 per task; ≤ 12 in total |

The estimate matches **Full** depth. Recommended: 2 PRs (server endpoint, then client).

## Required cross-references

- `docs/prd.md`: US-P1, AC-3, AC-5
- `docs/ux-ui/design.md`: §7 tokens, §10 accessibility
- `docs/trd/trd.md`: `results-framework-reporting` module, §1B QAS
- Family: archived #3 (DD-4), #4 (type→level map), #5 / #10 (KPI rule), #8 (endpoint pattern)
