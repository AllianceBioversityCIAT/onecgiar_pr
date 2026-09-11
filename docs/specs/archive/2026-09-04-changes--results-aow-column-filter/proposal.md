# Change Proposal — Area of Work on the Results tab: column, filter and Overview deep link

**Answer first:** the Results tab cannot show or filter by Area of Work because its payload (`GET api/results/get/all/roles/filter/:userId`) carries no AoW — a known, ticketed gap (P2-3398 Section filter, P2-3399 indicator line) that also forced the archived Overview scope-filter spec to **defer** propagating the selected AoW to the Results deep link (`OSF-DD-12`). The server already knows each result's AoW: the Overview's scope buckets are computed by joining `results_toc_result → toc_results → toc_work_packages` (`results-framework-reporting.service.ts:925-960`). Proposal: add that same join as an additive `area_of_work` field on the results list, switch on the Results tab's dormant **Section** filter and a new **Area of Work** column, and let every Overview link that is scoped to an AoW carry `section=<code>` so a chart click lands on the Results tab already filtered.

## 1. Document Control

| Field | Value |
|---|---|
| Type | **Change** |
| Spec path | `changes/results-aow-column-filter` |
| Slug | `results-aow-column-filter` — derived from free-text argument (*"adicionar la información del AOW … y que nos permita filtrar … desde el overview"*) |
| Approval Mode | `pre-approved (j.cadavid, standing feedback 2026-09-02 "pragmatic AKILI" — applied as default; flip to gated on request)` |
| Module | `results` (server list query, additive field) · `result-framework-reporting` (client `programme-results`, `dashboard-lab` Overview links) |
| Branch | `qa-development-2026` |
| Depends on | none (unblocks the deferred half of archived `changes/overview-aow-cross-filter` `OSF-R-7`) |
| Parallel-safe | **no** — edits `programme-results.component.ts` and `dashboard-lab.component.ts`, both hot files; one session per checkout (`KZ-MRF-3`) |
| Tickets | P2-3398 (Section filter, disabled "Coming soon"), P2-3399 (payload lacks AoW) — this spec closes both for the Results tab |
| Reported by | j.cadavid@cgiar.org, 2026-09-04, screenshot of SP12 Results tab |

## 2. Intent

A program lead who selects an Area of Work on the Overview (scope selector, hero row, status bar, ToC map) and clicks a chart should land on the Results tab **already filtered to that AoW**, and every result row should say which AoW it belongs to — the same AoW the Overview counted it under.

## 3. Problem / Current Behavior

| Surface | Today | Where |
|---|---|---|
| Results table row | no AoW column; `section` hardcoded to `''` | `programme-results.service.ts:152` (`toProgrammeResultRow`) |
| Results **Section** filter | rendered but **disabled** with a "Coming soon" tag; options list is wired and would fill itself if rows carried a section | `programme-results.component.html` (`pgr-filter--section`, `aria-disabled`), `.ts:702-706` |
| Overview → Results links (`OverviewLink`) | dimensions `status · category · origin · center · phase · createdBy`; **no `section`**; when an AoW scope is selected the link still opens the whole program | `program-overview.component.ts:52`, `programme-results-query-params.ts:18` |
| Overview AoW scope, hero rows, ToC map | scope selector filters the Overview (OSF); hero row / map click goes to **Reporting By-AOW** (`onOpenAow`) — never to Results | `dashboard-lab.component.ts:2170` |
| Server list endpoint | `findAllByRoleFiltered` returns results without any ToC/AoW field | `results.service.ts:1330` |
| Server scope buckets | per-AoW counts exist: `r → results_toc_result rtr → toc_results tr → toc_work_packages wp` with `UPPER(wp.acronym)` as the AoW code, plus `outcome` / `untagged` kinds | `results-framework-reporting.service.ts:925-990` |

So the data model already assigns each result to an AoW (or a program-level outcome, or "untagged"); only the list payload does not expose it.

## 4. Proposed Outcome

- **Server (additive):** `GET results/get/all/roles/filter/:userId` rows gain `area_of_work: { code: string; name: string; kind: 'aow' | 'outcome' | 'untagged' }[]` — one entry per ToC node the result is mapped to under its submitter initiative, deduplicated by code; empty array when unmapped (`untagged`). Same join and same bucket rule as the Overview scope buckets, so **Overview counts = Results filter counts** by construction.
- **Results tab:** new column **Area of Work** (code chip + name in `title`; multiple → `AOW01 +1` with the full list in `title`), default **on**; the **Section** multiselect becomes live (AoWs group + *Intermediate outcomes* / *2030 outcomes* + *Untagged*), with chips, counts in the options, `section` query param (`?section=AOW01,AOW02`), CSV export column. "Coming soon" tag and `aria-disabled` removed. Search also matches the AoW code/name.
- **Overview → Results:** `OverviewLink` gains `section?`; when an AoW scope is active every emitted link carries it (status-bar segments, category cards, origin/center charts); the scope-breakdown rows become links to Results filtered by that scope; a ToC-map AoW node and a hero AoW row keep going to Reporting By-AOW (existing contract) but gain a secondary *"View results"* affordance in their menu/tooltip where one exists. Filter-count pill on Results counts the section.
- **Reconciliation:** the Results tab's counter (`N results`) for a given AoW equals the Overview scope bucket total for that AoW at the same phase (`OSF-R-13` sentence).

## 5. Scope

- Server: `findAllByRoleFiltered` (+ repository SQL) gains the `area_of_work` aggregation (LEFT JOIN / correlated subquery, `GROUP_CONCAT` or a second query keyed by result id); DTO/Swagger; unit test on the repository mapping; no migration.
- Client `programme-results`: row model + mapper, column config, Section filter enablement, `matchesProgrammeResultFilters` for sections, query param + chip, CSV, tests.
- Client `dashboard-lab` / `program-overview`: `OverviewLink.section`, propagation from the active scope, scope-breakdown row links, tests.
- Folder guides (`programme-results/CLAUDE.md` gotchas table: remove the two "Coming soon" rows this closes).

## 6. Non-Goals

- The **indicator line** under the result title (P2-3399's other half) — needs per-result indicator ids, a different join; separate spec.
- Row checkbox / bulk actions (P2-3397), *View indicator* row action (P2-3395).
- Changing what the Overview counts or how scope buckets are built.
- Reporting tab and By-AOW view.
- Bilateral results list (`by-program-and-centers`) — already carries its own AoW.

## 7. Affected Users, Systems, And Specs

| Who / what | Effect |
|---|---|
| Program lead / PMU | AoW visible per result; chart click → filtered Results; Section filter works |
| Submitter | can find own results by AoW |
| Bilateral / platform-report consumers | none — different endpoints |
| `changes/overview-aow-cross-filter` (archived) | its deferred `OSF-R-7` half is delivered here; `OSF-AC-8`'s "must NOT add a scope parameter" clause is superseded |
| `changes/sp-overview-echarts/results-tab-filter-deeplink` (archived) | query-param contract extended with `section` |
| Server `results` module | additive field on a hot list endpoint (SP01 = 476 rows, `limit` 2000) — performance to be measured |

## 8. Visual Reference

- Source: **None generated** — the user's screenshot of the Results tab (2026-09-04) plus the existing Section filter control already present in the filter popover (disabled). The column follows the table's existing column vocabulary; no new tokens.
- Location: n/a. `/akili-specify` may sketch the multi-AoW chip in `design.md` §6.3 if needed.

## 9. Requirement Delta Preview

### ADDED Requirements
- Results list payload carries `area_of_work[]` per result (code, name, kind), computed with the Overview's join and bucket rule.
- Results tab **Area of Work** column (default on, sortable by first code, CSV-exported).
- Results tab **Section** filter live: AoWs + program-level buckets + Untagged; multi-select; `?section=` param; chips; counts.
- `OverviewLink.section`; every Overview link emitted under an active AoW scope carries it; scope-breakdown rows link to Results.
- Search on the Results tab matches AoW code and name.

### MODIFIED Requirements
- `programme-results` "Coming soon" contract: the Section filter is no longer disabled (P2-3398 closed for this tab).
- `OSF-AC-8` (archived): the Results deep link now **does** carry the scope.

### REMOVED Requirements
- None.

## 10. Approach Options

| # | Option | Pros | Cons |
|---|---|---|---|
| **A** | **Extend the existing list query with an additive `area_of_work` aggregation using the Overview's join** | one source of truth for result→AoW (counts reconcile by construction); no new endpoint; client changes are the dormant controls switching on | touches a hot list query — the aggregation must be a correlated subquery / grouped side query, not a fan-out join that multiplies rows; needs a latency check on SP01/SP02 |
| B | Client-side enrichment: after loading the list, call the ToC/units endpoints and map results to AoWs in the browser | no server change | needs per-result ToC mapping the client does not have (the units endpoint returns counts, not result ids) — would require a new endpoint anyway |
| C | New endpoint `results-framework-reporting/results-by-aow` returning ids per AoW, joined client-side | keeps the list query untouched | second request per visit, two payloads to keep consistent, duplicate join logic |

## 11. Recommended Approach

**Option A.** The join already exists and already defines "which AoW" for the Overview; exposing it on the list is the smallest change that makes the two tabs agree. Estimated: Standard depth, 5 tasks (server field + test · client row/column/CSV · Section filter + param · Overview propagation + breakdown links · live reconciliation check), ≈ 350 LOC source + tests.

## 12. Risks, Dependencies, And Open Questions

- **OQ-1 — Multi-AoW results.** A result mapped to ToC nodes in two AoWs belongs to both buckets on the Overview? Check how the scope query counts it (once per bucket, or first only). The column shows all codes; the filter matches any. **Recommendation:** mirror the Overview exactly, whatever it does, and disclose in the column `title`.
- **OQ-2 — Which initiative's ToC?** The Results tab lists results **submitted by** the program; contributing programs' ToC links must not leak in. The Overview query filters `rtr.initiative_id = ?` — reuse that.
- **OQ-3 — Phase.** The join must respect the result's `version_id`; the list is already phase-filtered, so the subquery keys on `(results_id)` only. Confirm no cross-phase ToC rows exist.
- **Risk — list latency.** A correlated `GROUP_CONCAT` over 476 rows is cheap; measure p95 on SP01/SP02 locally before/after (`AC` in specify).
- **Risk — hot files.** `dashboard-lab.component.ts` and `programme-results.component.ts` are edited by most specs; one session per checkout.
- **Dependency:** `env.DB_TOC` cross-database join (already used by the Overview query).

## 13. Success Criteria

1. Every Results row shows its AoW code(s); unmapped results show `—` and belong to *Untagged*.
2. Selecting an AoW on the Overview and clicking any chart segment opens Results with `?section=<code>` and the list pre-filtered; the Section chip shows it and Clear filters removes it.
3. For one AoW at one phase, Results `N results` = Overview scope bucket total (live on SP01 and SP12).
4. Section filter works standalone (multi-select, counts, chip, CSV column present).
5. List endpoint p95 on SP01 within +50 ms of today (local measurement, 3 runs).
6. Jest: server repository mapping, client mapper/filter/param/column, Overview link propagation; one live reconciliation read.

## 14. Next Step

```text
/akili-specify changes/results-aow-column-filter
```

Standard depth, Change track. Specify resolves OQ-1..3 by reading the scope-bucket query and one live payload before writing tasks.
