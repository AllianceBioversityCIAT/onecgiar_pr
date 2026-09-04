# Design — Area of Work on the Results tab (`changes/results-aow-column-filter`)

**Answer first:** extract the `result_scope` CTE that `getScopeBuckets` already runs into one shared private query (`queryResultScopeRows`), expose it through a new read-only endpoint `GET api/results-framework-reporting/results-scope?programId&versionId` that returns one `{ result_id, key, kind, codes }` per result, and let the Results tab fetch it beside its list and join by `result_id`. The client's dormant `section` plumbing then switches on with the Overview's bucket-key vocabulary, one new column joins the catalog, and the host's `onOverviewLink` stamps the active scope onto every link. No change to the results-list endpoint, no migration.

## Document Control

| Field | Value |
|---|---|
| Linked requirements | `requirements.md` — RAC-R-1..R-7, RAC-AC-1..8 |
| Depth | Standard — re-sized in §14 |
| Approval Mode | `pre-approved` (inherited) — Phase 2 gate: *auto-approved (pre-approved mode)*; reversion challenge §12 run inline; judgment-day one pass (§15) |
| Skills | `nestjs-expert` + `api-design-principles` (endpoint), `angular-developer` (signals, table, params), `tdd` (mapper, join, filter predicates), `ui-ux-pro-max` (column + chip) |
| Budget | 5 tasks · ≈ 380 LOC source (≈ 120 server / ≈ 260 client) + ≈ 550 tests · ≤ 1 Reviewer round per task — see §14 |
| Judgment-day | one pass (§15) |
| Deviation from proposal | Option A (extend the list endpoint) → **Option C corrected** (new reporting-module endpoint + client join); cause: `ResultsFrameworkReportingModule` imports `ResultsModule`, so the list service cannot reach the ToC-context resolver without a cycle — see `RAC-DD-1` |

## 1. Summary

The rule "which bucket does this result belong to" already has one home: the `result_scope` CTE inside `getScopeBuckets` (`results-framework-reporting.service.ts:1027-1075`). This design refactors that CTE into a shared method returning **per-result rows**, has `getScopeBuckets` aggregate from it (behaviour unchanged, OSF-AC-12 / OSF-T-3 stay green), and adds a thin endpoint that returns the rows. The client joins them into the Results rows, enables the Section filter it already has, adds a column, and stamps the Overview scope on deep links. Accepted trade-off: one extra request per Results visit, in exchange for a single home for the rule and an untouched hot list endpoint.

## 2. Architecture Overview

### 2.1 Where this lives
- **Server:** `api/results-framework-reporting/` — `results-framework-reporting.controller.ts` (+ `GET results-scope`), `.service.ts` (`queryResultScopeRows` extracted; `getScopeBuckets` consumes it; new `getResultsScope(programId, versionId)`), `application/queries/results-scope/` (DTO + pure mapper `toResultScopeDto` + specs). Reuses `resolveInitiative`, `ReportingTocContextService.resolveByVersionId`, `W1_W2_RESULT_SOURCE_FILTER` is **not** applied to the new endpoint (Results tab lists all sources — RAC A-3).
- **Client:** `pages/programme-results/` (`services/programme-results.service.ts` fetch + join; `services/programme-results-filter.service.ts` section predicate/labels; `services/programme-results-query-params.ts` + `section`; `programme-results.component.{ts,html,spec.ts}` column, options, control, CSV), `shared/services/api/results-api.service.ts` (`GET_ResultsScope`), `pages/dashboard-lab/dashboard-lab.component.ts` (`onOverviewLink` stamps scope), `pages/dashboard-lab/components/program-overview/*` (`OverviewLink.section`, breakdown row *View results*).
- **External:** none.

### 2.2 Data flow (after)

```
Overview                                  Results tab
  scopeBuckets (clarisa-global-units) ◄─┐   GET results/get/all/roles/filter (unchanged)  ─┐
      getScopeBuckets() ────────────────┤                                                    ├─► rows[]
        └─ queryResultScopeRows() ◄─────┼── GET results-framework-reporting/results-scope ──┘   join by result_id
             (shared CTE, one row       │      ?programId=SP01&versionId=36                      → row.section = key
              per result: key/kind/codes)                                                          row.aowCodes = codes
  overviewScope() ── onOverviewLink() ── adds section=<scope> ──► /entity-details/SP01/results?section=AOW01&…
  breakdown row "View results" ──────────────────────────────────► ?section=<row.key>
```

## 3. Data Model Changes

None. No entity, no migration.

## 4. API Surface

### 4.1 New endpoint

| Field | Value |
|---|---|
| **Method + path** | `GET /api/results-framework-reporting/results-scope` |
| **Version** | `api` |
| **Auth / role** | JWT (`auth` header) as every sibling in the controller; no role narrowing (read-only, same visibility as `clarisa-global-units`) |
| **Query** | `programId` (string, required — official code or id, resolved by `resolveInitiative`), `versionId` (integer, required → `ReportingTocContextService.resolveByVersionId`; non-numeric → 400 like `resolveTocContextForRequest`) |
| **Response** | `{ response: { programId, versionId, buckets: ResultScopeDto[] }, message, status }` with `ResultScopeDto = { result_id: number; key: string; kind: 'aow' \| 'outcome' \| 'untagged'; codes: string[] }` — one entry per **result of the program at that version** (population = `results_by_inititiative` membership, so unlinked results appear as `UNTAGGED`, RAC-R-1.1) |
| **Errors** | 404 unknown program / no active year (existing helpers); 400 bad `versionId` |
| **Telemetry** | none |

### 4.2 Bilateral / platform-report impact
None.

## 5. Server Workflow / Business Rules

- **`queryResultScopeRows(initiativeId, tocContext, { sourceFilter })`** — the `result_scope` CTE lifted verbatim from `getScopeBuckets` and extended with `GROUP_CONCAT(DISTINCT UPPER(wp.acronym) ORDER BY 1)` as `aow_codes`, returning `{ result_id, status_id, aow_acronym, has_intermediate, has_eoi, aow_codes }` per result. `sourceFilter` is a parameter so `getScopeBuckets` keeps passing `W1_W2_RESULT_SOURCE_FILTER` (byte-identical population) while `results-scope` passes none.
- **`getScopeBuckets`** aggregates the rows in TypeScript (bucket key → status → count) instead of the SQL `GROUP BY bucket_key, status_id`; the residual/total logic is untouched. OSF-T-3 spec fixtures move from "grouped rows" to "per-result rows" in T-1 (an assertion *shape* change, commented `// RAC-DD-2`).
- **`getResultsScope(programId, versionId)`** — resolve initiative + `tocContext`, run `queryResultScopeRows` without the source filter, then **left-join against the program population** (`results_by_inititiative` for the version, any `initiative_role_id`, the same membership the Overview total uses — RAC A-5) so unlinked results are emitted as `UNTAGGED`; map with the pure `toResultScopeDto(row)`: `key = aow_acronym ?? (has_intermediate ? 'INTERMEDIATE' : has_eoi ? 'EOI_2030' : 'UNTAGGED')`, `kind` accordingly, `codes = aow_codes.split(',')`.
- Unit tests: mapper (four fixture rows → four DTOs, tie-break lowest code, codes list, unlinked → UNTAGGED); service (controller wiring, 400 on bad version, `getScopeBuckets` totals unchanged against the same fixture as OSF-T-3).

## 6. Frontend Plan

### 6.1 Routes / modules
No route change. `?section=` joins the Results route's query-param contract (`programme-results-query-params.ts`: `PROGRAMME_RESULTS_SECTION_QUERY_PARAM = 'section'`, dimension union + map).

### 6.2 Components & services

| Piece | Design |
|---|---|
| `results-api.service.ts` | `GET_ResultsScope(programId, versionId)` → `…/results-framework-reporting/results-scope?programId=&versionId=` |
| `ProgrammeResultsService` | new `scope = signal<Map<number, ResultScope> \| null>`, `scopeLoading`, `scopeError`; `loadScope(programId, versionId)` token-guarded like `loadResults`; refetch on phase change; `rows()` mapper reads `scope()`: `section = bucket?.key ?? (scopeLoading ? '' : 'UNTAGGED')`, `aowCodes = bucket?.codes ?? []`, `sectionState: 'ready' \| 'loading' \| 'error'`; **rows whose `versionId` ≠ the scope's version keep `section = ''`** (A-1). `sectionOptions` counts computed from `rows()` |
| `ProgrammeResultsFilterService` | `matchesProgrammeResultFilters` section clause stays (exact key match, case-insensitive); `activeChips` label via `sectionLabel(key)` (`AOW01` / *Intermediate outcomes* / *2030 outcomes* / *Not tagged*); `clearAll` unchanged (already clears sections) |
| `programme-results.component.ts` | `PGR_COLUMNS` gains `{ key: 'aow', label: 'Area of Work', sortField: 'sectionSort', track: '132px', minPx: 132, optional: false }` placed after Category; `sectionSort` = rank string (`0_AOW01`, `1_INTERMEDIATE`, `2_EOI_2030`, `3_UNTAGGED`); `sectionOptions` = *Areas of work* (codes present, `AOW01 (12)`, name appended when units known — R-7) + *Program-level* (three fixed keys with counts); the Section control's `aria-disabled`, `opacity-60`, `title` and the `#comingSoon` outlet removed; `cellText('aow')` → label (+ ` +N`); CSV via `cellText`; search haystack adds key + label; URL bridge reads/writes `section` (comma list) |
| `programme-results.component.html` | Area of Work cell: code chip (existing chip class) or fixed label; `title` = all codes; skeleton bar while `sectionState === 'loading'`; `—` + `title` on error (RAC-R-2.1) |
| `program-overview.component.ts` | `OverviewLink.section?: string`; breakdown rows (`scopeBreakdown()` list, template ~L1095-1125) gain a *View results* icon button per row → `emitLink({ section: row.key })` (does not change the row's existing `selectScope` click) |
| `dashboard-lab.component.ts` | `onOverviewLink(link)`: `const scope = this.overviewScope(); if (scope && link.section === undefined) link = { ...link, section: scope }` before the param map; `PROGRAMME_RESULTS_QUERY_PARAM_MAP.section` handles the rest |

### 6.3 Design system usage
- Column chip reuses the table's `.pgr-chip`-like code chip (same as the Code column's mono style); fixed labels in `--pr-text-secondary`; `+N` in `--pr-text-muted`. No new tokens.
- Section options: the existing `app-pr-filter-multiselect` with groups (already in the template). Copy: *Areas of work*, *Program-level*, labels above; chips `Section: AOW01`.
- A11y: header `scope="col"` + `prSortableColumn`; the enabled multiselect is keyboard-reachable; chip remove buttons keep their `aria-label`.
- Responsive: the column adds a 132 px track; the table already scrolls horizontally below `md` (design §9).

### 6.4 Real-time / notification UX
None.

## 7. Security & Authorization
Read-only endpoint behind the same JWT guard as the controller's siblings; inputs validated (`programId` resolved or 404, `versionId` integer or 400); no new logging.

## 8. Performance & Capacity
`results-scope`: one CTE over the program's results at one version (SP01 ≈ 500 rows) — same cost as the scope-bucket query the Overview already runs; target p95 < 300 ms locally, measured 3× in T-5. Client: one extra request in parallel with the list; join is O(n) over ≤ 2000 rows. The hot results-list endpoint is untouched.

## 9. Observability
None.

## 10. Testing Plan
- **Server unit:** `toResultScopeDto` fixture (tie-break, codes, INTERMEDIATE, EOI_2030, UNTAGGED, unlinked result present); `getScopeBuckets` OSF-T-3 fixtures re-shaped to per-result rows and totals asserted unchanged; controller/service wiring + 400 path.
- **Client unit/DOM (Jest):** service join (map by id, other-version rows `''`, loading/error states); filter service labels + predicate; component: column cell texts incl. `+1` and `title`, skeleton/error states, options with counts, select → rows/chip/badge/URL, hydrate `?section=A,B` without rewriting, sort order, CSV header/cell, search by key; host `onOverviewLink` with/without scope; overview breakdown *View results* emit.
- **Live (T-5):** SP01 and SP12 reconciliation per key (`RAC-AC-7`), latency 3 runs, search.

## 11. Backwards Compatibility & Migration
Additive endpoint; optional `OverviewLink.section`; the Results tab's two dormant constants replaced (never live). Rollback = revert the PR.

## 12. Design Decisions

### `RAC-DD-1` — New endpoint in the reporting module, not a field on the results list
- **Context:** the proposal preferred extending `get/all/roles/filter`. `ResultsFrameworkReportingModule` imports `ResultsModule` (`results-framework-reporting.module.ts:15,51`); the AoW rule needs `ReportingTocContextService` and the scope CTE, both in the reporting module → the list service cannot import them without a module cycle, and copying the CTE into the results module would create a second home for the rule.
- **Decision:** thin read-only endpoint in the reporting module that reuses the CTE; the client joins by id.
- **Alternatives:** `forwardRef` module cycle (fragile, hides the dependency direction); duplicate CTE in `result.repository.ts` (drift — the class of defect `bugfix/kpi-count-reconciliation` just paid for); enrich in the results controller with an `include=aow` flag (same cycle).
- **Consequences:** one extra request per Results visit; the list endpoint and its many callers stay untouched.

### `RAC-DD-2` — `getScopeBuckets` aggregates per-result rows from the shared query
- **Context:** the CTE is the single source of the bucket rule; the endpoint needs rows, the Overview needs counts.
- **Decision:** one query returning rows; two consumers. `getScopeBuckets`' output is asserted unchanged against its existing fixtures.
- **Reversion challenge (§2.3 — "what does replacing the SQL `GROUP BY` break?"):** the OSF-T-3 spec mocks `dataSource.query` rows in the *grouped* shape; those fixtures must be re-shaped to per-result rows (assertion shape change, sanctioned and commented `// RAC-DD-2`), totals unchanged. No caller reads the intermediate SQL. **Outcome: proceed.**

### `RAC-DD-3` — Section values are the Overview's bucket keys
- **Context:** the Results tab had placeholder constants (`intermediate-outcomes`, `2030-outcomes`) never used live; the Overview's `?scope=` uses `INTERMEDIATE` / `EOI_2030` / `UNTAGGED` / AoW codes.
- **Decision:** one vocabulary; `?section=` and `?scope=` carry the same strings. Labels are display-only.
- **Reversion challenge ("what does removing the two constants break?"):** grep shows them used only in `sectionOptions` of `programme-results.component.ts` (disabled control) — no test pins the strings, no URL ever carried them. **Outcome: proceed.**

### `RAC-DD-4` — Scope is stamped in the host, not in every chart builder
- **Context:** links are built in ~6 places inside `program-overview` (segments, cards, pies, heatmap cells, rows).
- **Decision:** `dashboard-lab.onOverviewLink` adds `section` from `overviewScope()` when the link has none — one seam, one test. Breakdown rows pass an explicit `section` (they are the scope).
- **Alternatives:** thread the scope through each builder (six edits, six tests, same result).

### `RAC-DD-6` — Reconciliation is stated on the owner population (inline judgment JI-1)
- **Context:** the Overview total counts any program membership; the Results tab lists owned results only (`submitter_id` → `initiative_role_id = 1`). Contributor-only results can sit in an Overview bucket with no Results row.
- **Decision:** `RAC-R-5` compares the owner population under W1/W2; the endpoint still returns buckets for every linked result (superset, harmless to the join); T-5 quantifies the contributor-only delta per key and hands it to a follow-up on the Overview population rather than widening this spec.
- **Alternatives:** filter the endpoint to owners (would hide a real Overview discrepancy); change the Overview total (out of scope, OSF territory).

### `RAC-DD-5` — Loading and failure of the bucket request are visible, never silent
- **Context:** the Results tab must keep working if the new endpoint is slow or down.
- **Decision:** `sectionState` drives a skeleton cell while loading and `—` + explanatory `title` on error; the Section filter offers only *Program-level* keys while buckets are missing; list, other filters and export are unaffected.

## 13. Open Gaps & Follow-ups
- Indicator line under result titles (P2-3399 other half) — separate spec.
- Results Center (cross-program list) does not get the column — out of scope; would need the endpoint per initiative.
- W3/bilateral rows are outside the Overview's W1/W2 population; reconciliation is stated under the W1/W2 funding filter (A-3).

## 14. Budget (Step 2.4 re-size)

| Metric | Estimate | Note |
|---|---|---|
| Tasks | **5** | server endpoint + shared query · client fetch/join + column · Section filter + param · Overview propagation + breakdown link · live reconciliation + docs |
| LOC | **≈ 380 source** (120 server / 260 client) **+ ≈ 550 tests** (`KZ-REH-1`: DOM + wiring tests dominate; no CT needed — no layout claim beyond a fixed track) | trip at > 1 300 total |
| Review rounds | **≤ 1 per task** | second FAIL escalates |

Standard confirmed (above Lite; below Full — additive read endpoint, no data or auth surface).

## 15. Judgment-day
One pass after `tasks.md`; severe findings applied, no re-judge (standing feedback). Ledger: `judgment.md`.

## Required cross-references
- `requirements.md` (same folder); `docs/prd.md` US-P1, G1; `docs/ux-ui/design.md` §4, §6, §9, §10; `docs/trd/trd.md` §2.
- `pages/programme-results/CLAUDE.md` (Coming-soon table, `custom-fields` ban, z-index gotcha); archived `overview-aow-cross-filter` (OSF-DD-2/2b/2d/3/12).
