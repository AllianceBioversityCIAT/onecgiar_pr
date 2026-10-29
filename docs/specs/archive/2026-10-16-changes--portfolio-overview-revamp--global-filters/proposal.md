# Proposal — Global filters for Portfolio Overview (stakeholder item 2)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/global-filters/` |
| Slug | `global-filters` (given as a path argument) |
| Type | Change |
| Approval Mode | gated |
| Author | santiago.sanchez@cgiar.org |
| Date | 2026-10-16 |
| Module | client `result-framework-reporting` › `portfolio-overview` + server `results-framework-reporting` (one new read endpoint) |
| Depends on | #1–#5, #7, #8, #10: all done and archived. Nothing blocks this spec |
| Blocks | #9 `changes/portfolio-overview-revamp/filtered-detail-export` |
| Parallel-safe | no. It edits the page template, the service and every block |
| Parent Spec | `changes/portfolio-overview-revamp` (family #6) |

## 2. Intent

Stakeholder item 2: *"Global filters: Program/Accelerator · W3/bilateral project · Center · typology · status, applicable to all charts."*

Add **one filter bar** at the top of `/portfolio-overview`. Every section recomputes from the same selection. A section that cannot honour a filter says so in place; it never shows unfiltered numbers as if they were filtered.

## 3. Problem / Current Behavior

The page is now final (#1–#5, #7, #8 shipped), but it has **two kinds of data path**, and a filter reaches them differently:

| Section | Data path | Program | Project | Center | Typology | Status |
|---|---|---|---|---|---|---|
| KPI deck | `data.rows()` (client) | ✅ `submitter` | ❌ not on the wire | ⚠️ `lead_center` only | ✅ `result_type`, `result_level_name` | ✅ `status_id` |
| Results Reporting Status | `data.rows()` | same | same | same | same | same |
| Results by typology | `[rows]="data.openRows()"` (hook left for #6, TYV) | same | same | same | same | same |
| Progress against ToC KPIs | own endpoint `toc-results/portfolio-coverage`, one row per P/A | ✅ pick rows | ❌ | ❌ | ❌ | ❌ fixed by definition (QA + Submitted, pooled) |
| CGIAR Centers | own path, `GET_bilateralCenterResults` per Center | ✅ `submitter` | ✅ `project_id` (lead) | ✅ per-Center rows | ✅ `result_type` | ✅ `status_id` (block has its own status filter) |
| W3/Bilateral projects | own endpoint `portfolio/bilateral-projects`, aggregate by P/A and Center | ✅ pick rows | ❌ | ✅ pick rows | ❌ | ❌ |

Gaps:

- **The page payload has no project and no contributing Centers.** `AllResultsByRoleUserAndInitiativeFiltered` (`result.repository.ts:686`) selects `lead_center` only, and has no `results_by_projects` join.
- That query **also serves the Results Center list**. Adding `GROUP_CONCAT`s to it would put the cost (R-1 of the parent proposal) on every Results Center load, not only on this admin page.
- Three status controls already exist: the page's `selectedStatusFilter`, the Centers block status tiles, and its origin buttons. A global status filter has to compose with them, not fight them.

## 4. Proposed Outcome

```
┌ Filters ───────────────────────────────────────────────────────────────────────────────┐
│ [Program/Accelerator ▾] [W3/Bilateral project ▾] [Center ▾] [Typology ▾] [Status ▾]   │
│ Active: SP02 · CIAT · Outcome  ✕        Clear all                    1 284 of 6 094     │
└────────────────────────────────────────────────────────────────────────────────────────┘
[ KPI cards ]                      ← filtered
[ Results Reporting Status ]       ← filtered
[ Results by typology ]            ← filtered
[ Progress against ToC KPIs ]      ← Program only · "Not affected by: project, Center, typology, status" ⓘ
[ CGIAR Centers ]                  ← all 5 filters, client-side over its own rows
[ W3/Bilateral projects ]          ← Program + Center only · "Not affected by: …" ⓘ
```

- Within a dimension, values combine with OR. Across dimensions, they combine with AND.
- Center = led **or** contributed (parent OQ-5).
- Every section that ignores an active filter shows a one-line "Not affected by …" note. The note appears only while that filter is active.

## 5. Scope

| Layer | Item |
|---|---|
| Server | A new admin-only read endpoint `GET results-framework-reporting/portfolio/result-dimensions?versionId=`. It returns, for every result of the version: `result_id → { project_ids[], center_codes[] (lead + contributing) }`. It also returns the project catalogue for the options (id, short name). Same coercion and role guard as `portfolio/bilateral-projects`. |
| Client service | A `filters` signal and a `filteredRows()` computed in `PortfolioOverviewService`. `kpiTotals`, `statusSegments`, `totals` and the rest read `filteredRows()`. `versionId`, `phaseName` and `closedPhase` keep reading the unfiltered rows. Widen `RawResult` with `id`, `result_level_name` and `title`. Join the dimensions map by `id`. |
| Client UI | New `components/filter-bar/`: 5 Spartan multi-selects, active-filter chips, "Clear all", matched count. Options are built from the open-phase rows plus the dimensions catalogue, never hardcoded. |
| Blocks | Typology gets `filteredRows()`. ToC KPI and Projects get a `filters` input and narrow their own rows by P/A (and Center for Projects). Centers gets a `filters` input and applies all 5 to its rows, composed with its local status and origin controls. A shared "Not affected by" line. |
| States | A new "No results match these filters" state, separate from the phase-empty state. `isPartial()` stays visible under any filter. |
| URL | Filters are mirrored in query params (`?program=SP02&center=CIAT…`), so a filtered view can be shared and reloaded. |
| Docs/tests | Copy file, scoped Jest specs (`--maxWorkers=2`), the page `CLAUDE.md` section, server repository and controller specs. |

## 6. Non-Goals

- No change to `AllResultsByRoleUserAndInitiativeFiltered` or to the Results Center list.
- No re-definition of a ToC KPI or of "covered" to make them filterable by status or typology. That rule is fixed by #5 and #10.
- No server-side filtering of the Projects aggregate by status or typology. A project is not a result.
- No results list and no export. Those belong to #9.
- No saved or named filter presets.

## 7. Affected Users, Systems, And Specs

- **Users:** Admin / PMU readers of `/portfolio-overview` (`CheckAdminGuard`).
- **Server:** `results-framework-reporting` (controller, service, repository, DTO). It reads `results_by_projects`, `results_center`, `clarisa_center` and `clarisa_projects`.
- **Client:**
  - `portfolio-overview.component.{ts,html}` and `services/portfolio-overview.service.ts`
  - the four blocks under `components/`
  - new `components/filter-bar/`
  - `internationalization/portfolio-overview.copy.ts`
  - `ResultsApiService` (new `GET_PortfolioResultDimensions`)
- **Related specs:**
  - archived #3 `centers-new-vs-replicated`: the origin filter and DD-4 (its KPI cards ignore the origin)
  - #4 `typology-view`: the `rows` hook
  - #5 / #10: the KPI rule
  - #8 `w3-projects-section`: endpoint pattern, Unassigned Center
  - #9 `filtered-detail-export`: consumes `filteredRows()`

## 8. Visual Reference

- Source: none. Stakeholder text only, plus the ASCII layout in §4.
- Location: — (no `mockup/` folder yet).
- Notes: the bar uses Spartan primitives (memory: visual changes use Spartan). An optional HTML mockup under `mockup/` before `/akili-specify` is worth doing for the bar at 375 px, where 5 selects must wrap or collapse.

## 9. Requirement Delta Preview

### ADDED
- A global filter bar with 5 multi-select dimensions, chips, "Clear all", a matched count, and URL sync.
- An endpoint that maps each result to its projects and its lead + contributing Centers, for one version.
- A "Not affected by …" note on every section that ignores an active filter.
- A "No results match these filters" state.

### MODIFIED
- KPI deck, status section and typology aggregate the **filtered** rows.
- ToC KPI and Projects blocks narrow their rows to the selected P/A (and, for Projects, the selected Centers).
- The Centers block applies the global filters to its own rows. Its local status and origin controls compose on top of them.
- `RawResult` declares `id`, `title` and `result_level_name`.

### REMOVED
- The page-level `selectedStatusFilter`, if OQ-3 lands on "global status replaces it". The default in OQ-3 removes it.

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. Client filtering + a separate dimensions endpoint** | §5 | The Results Center query is untouched. One extra request per page load. Every row-driven figure agrees by construction. #9 reuses `filteredRows()` | Two requests to join by `id`. The aggregate blocks honour only some filters, and say so |
| B. Extend `AllResultsByRoleUserAndInitiativeFiltered` with `GROUP_CONCAT` projects/centers | Parent R-1 | One request | Slows the Results Center for every user. Shared-query risk on a hot path |
| C. Server-side filters on every endpoint (page, ToC, Projects, Centers) | Query params everywhere | Every block fully filterable | 4 endpoints change. ToC KPI and Projects semantics need product decisions that do not exist. About 3× the size; drifts from what #9 lists |

## 11. Recommended Approach

**Option A.** It is the smallest path that keeps the shared Results Center query untouched. It makes the three row-driven sections and the Centers block honour all 5 filters. It is honest about the two aggregates, which only accept the filters that make sense for them. It also gives #9 a single `filteredRows()` to list and export.

Size: **L**, about 7 tasks. The server half (endpoint) has no client dependency and can run first.

## 12. Risks, Dependencies, And Open Questions

| ID | Item | Proposed default / action |
|---|---|---|
| OQ-1 | **Project filter scope:** list only projects linked to W3 rows, or any project linked to an open-phase result (W1/W2 included, since `results_by_projects` has both; see memory "bilateral fixes filter source")? | Options: projects linked to at least one **W3** result (the stakeholder said "W3/bilateral project"). Matching: a row matches if it has an active link to the project, whatever its source. W1/W2 rows can be linked to the same project, as #8 counts. |
| OQ-2 | **Typology** = level (Output / Outcome / Impact), type, or both? | One select grouped by level, with types under each. Picking a level selects all its types. It reuses `typology.aggregate.ts`. |
| OQ-3 | **Global status vs the existing status controls** | The global Status filter **replaces** the page's `selectedStatusFilter`, and clicking a status tile sets the global filter. In the Centers block, its tiles stay a local refinement *inside* the global selection. Its KPI cards follow the global filters but still ignore the local origin (DD-4 holds). |
| OQ-4 | **Program filter on W3 rows:** `submitter` on W3 rows is the mapped P/A. Is that what stakeholders mean? | Yes. It matches the KPI deck and the typology "by P/A" view. |
| OQ-5 | URL sync: in scope? | Yes. Cheap, and it lets PMU share a filtered view. Unknown values in the URL are dropped silently. |
| R-1 | The Centers block total ≠ the page's W3 tile under a Center filter (per-Center vs per-result counting; already documented as R-4 in the parent) | Keep it. The copy already says "led or contributed". Add a spec scenario so nobody "fixes" it. |
| R-2 | The dimensions endpoint on about 6–20k results | One query with two `GROUP_CONCAT`s, on one version, admin only. Measure p95 on prdb as #8 did (0.98 s). Fallback: lazy-load it on the first Project/Center filter use. |
| R-3 | If the dimensions request fails, the Project and Center filters cannot work | Disable those two selects with a tooltip and a Retry. The other 3 filters keep working. Never treat "no map" as "no match". |
| R-4 | `GROUP_CONCAT` truncation (`group_concat_max_len` 1024) | Return JSON arrays, or rows `(result_id, kind, value)` grouped in the service. Decide in design. |
| R-5 | Every block spec mounts the page. New inputs mean `spartanBrainMock` must declare the Helm inputs of the multi-select (page `CLAUDE.md` gotcha, NG0311) | Spec task includes the mock update. Run scoped Jest only. Memory: run affected client specs before commit. |
| R-6 | 5 selects at 375 px | Collapse into a "Filters (n)" sheet at the small breakpoint. The mockup decides. |

## 13. Success Criteria

- With any filter combination, the filtered KPI total = the filtered status total = the typology total. With only a Center or Project filter, each of these equals an independent prdb query, checked for at least 2 combinations.
- The ToC KPI and Projects blocks show only the selected P/As (and Centers for Projects). Their "Not affected by" line names exactly the active filters they ignore.
- The Centers block, under global filters, reconciles New + Replicated = its total.
- "Clear all" restores the unfiltered figures exactly. A reload with query params restores the same view.
- The Results Center list query and its latency are unchanged (no diff in `result.repository.ts:686`).
- Scoped Jest is green on server and client.

## 14. Next Step

```text
/akili-specify changes/portfolio-overview-revamp/global-filters
```

Optional first step: an HTML mockup of the filter bar (desktop and 375 px) under `mockup/`.
