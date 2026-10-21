# Design — Center Overview counts W3/bilateral reporting only

## 1. Summary

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/replicated-innovations-2026-pa/center-overview-w3-scope/` |
| Requirements | `requirements.md` (`CWS-R-1..8`) |
| Depth | Standard |
| Status | approved 2026-10-21 (owner) |
| Date | 2026-10-21 |
| Budget (`/akili-execute` tripwire) | **6 tasks (4 code + 2 HITL checks) · ~400 LOC incl. tests · ≤ 2 review rounds per task** |

**Approach.** Add one opt-in query param, `scope=bilateral`, to `GET /api/results/bilateral-center-results`. It makes the SQL keep only the three categories Nicoleta kept.

- `BilateralOverviewService` sends it, so every Overview card and the Reporting projects panel read the scoped rows.
- The shared query-param contract gets a matching `scope` key.
- The Results tab sends the server param when the key is in its URL, and shows a chip for it.
- Overview links to Results always carry the key.

No migration, no new endpoint, no `/api/bilateral/*` payload change.

## 1A. Premise Ledger

| ID | Premise | Evidence | Status |
|---|---|---|---|
| `P-1` | The category is resolved in SQL, and today nothing is filtered by category | `result.repository.ts` `getResultsByBilateralCenter` (`CASE … AS overview_category`, `WHERE rc … OR (? = 1 AND tagging)`) | verified 2026-10-21 |
| `P-2` | `BilateralOverviewService` rows are also read by the **Reporting projects panel** (`bilateral-projects-panel.component.ts:88`: per-project result, replicated and new-for-review counts) and invalidated by `bilateral-manual-create-flow.service.ts` / `results-api.service.ts` | grep of `BilateralOverviewService` consumers | verified |
| `P-3` | Scoping the service does not change the panel's per-project counts, except for replicated W1/W2 rows on a center project. The panel counts only rows with `project_id` in the center's project list. The removed `w1w2_center_only` rows have no center project by definition. Replicated W1/W2 rows on a CIP project: **0** (prod 2026-10-21) | prod query 2026-10-21 (CIP) | verified for CIP; **all-center count = `CWS-T-1` pre-check** |
| `P-4` | The Results tab fetches `bilateral-center-results` per selected phase **without** any flag (`bilateral-results-list.component.ts:729/735`) and filters on the client with `filterCenterResults` | code | verified |
| `P-5` | The Overview's no-project link (`project: []`) opens Results with no project filter. That link never reconciled with the figure | `bilateral-overview.component.html` ≈ line 401 | verified, recorded in `CWS-R-8` |
| `P-6` | The Portfolio Centers block (`centers-block.component.ts:262`) calls the endpoint without flags | code | verified, untouched |

## 2. Architecture Overview

### 2.1 Where this lives

| Layer | File | Change |
|---|---|---|
| Server controller | `onecgiar-pr-server/src/api/results/results.controller.ts` (`getBilateralCenterResults`) | Reads `scope`, documents it with `@ApiQuery` |
| Server service | `results.service.ts` `getBilateralCenterResults` | Passes the scope through |
| Server repository | `result.repository.ts` `getResultsByBilateralCenter` | Scope → tagging rows on + category predicate in `WHERE` |
| Client API | `shared/services/api/bilateral-api.service.ts` `GET_bilateralCenterResults` | Options carry `scope` |
| Contract | `pages/bilateral/bilateral-query-params.ts` | New `scope` key: parse, serialize, `present` |
| Overview data | `pages/bilateral/services/bilateral-overview.service.ts` | Sends `scope=bilateral` instead of `includeProjectTagging` |
| Overview model | `pages/bilateral/pages/bilateral-overview/bilateral-overview.aggregate.ts` | 3 display categories, Projects covered by new rows, no-project row simplified |
| Overview view | `bilateral-overview.component.ts` / `.html` (+ `charts.ts` only if a category list is read there) | Copy, links carry scope |
| Results tab | `pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.ts` | Scope signal in the fetch pipeline, scope chip |

### 2.2 Interaction

1. The Overview asks `BilateralOverviewService.load(center, phase)`. The service requests `bilateral-center-results?centerId&versionId&scope=bilateral`.
2. The repository builds the same CTEs as today, turns the tagging rows on, and filters to the 3 categories. It returns ~63 rows for CIP.
3. `buildOverviewModel` counts them. The Reporting projects panel reads the same cache entry.
4. A figure link serializes `{…filters, phase, scope: 'bilateral'}` with `explicitDefaults`.
5. The Results tab parses `scope`, requests `…&scope=bilateral` for each phase, applies `filterCenterResults`, and shows the chip "Scope: Bilateral reporting (Overview)".
6. When the user removes the chip, `writeUrl` drops the key. The pipeline sees the scope change and refetches unscoped.

## 3. Data Model Changes

None. No entity, migration or CLARISA change.

## 4. API Surface

### 4.1 Changed endpoint

`GET /api/results/bilateral-center-results`

| Param | Status | Meaning |
|---|---|---|
| `centerId`, `versionId` | unchanged | — |
| `includeProjectTagging=true` | unchanged, kept | Adds tagging rows; no category filter (current behavior) |
| **`scope=bilateral`** | **new, optional** | Implies the tagging rows. Returns only `replicated_w3`, `new_w3`, `w1w2_tagging`. Any other value = no scope |

The response shape is unchanged: same fields, `{ response: [...] }` envelope.

### 4.2 Bilateral / platform-report impact

None. `/api/bilateral/*` and `bilateral-result-summaries.en.md` are not touched.

## 5. Server Workflow / Business Rules

- The repository method gets one boolean (`bilateralScope`), derived in the controller from `scope === 'bilateral'`. The service passes it through, as it does `includeProjectTagging` today.
- **Tagging:** the existing `includeProjectTagging` parameter slot receives `includeProjectTagging || bilateralScope`.
- **Category predicate:** a second bound flag adds a condition to the `WHERE`. When the flag is on, a row is kept only when it is W3 (`source = 'API'`, replicated or not) or a non-replicated `Result` that is in `tagged`.
  - That is exactly the complement of `replicated_w1w2` ∪ `w1w2_center_only` under the current `CASE` precedence (`CWS-DD-2`).
  - The predicate is written next to the `CASE`, with a comment that the two must change together.
- The flag is a bound parameter (`? = 1`), like the existing tagging flag. When off, the `WHERE` clause evaluates exactly as today, so the unscoped query keeps its current behavior; only the extra bound flag is new (`CWS-R-1` C).

## 6. Frontend Plan

### 6.1 Routes / modules

No route change.

### 6.2 Components & services

| Unit | Design |
|---|---|
| `bilateral-api.service.ts` | `GET_bilateralCenterResults(centerId, versionId, options?)`. The third argument becomes an options object `{ includeProjectTagging?, scope? }`. The only boolean caller is the Overview service, which moves to `{ scope: 'bilateral' }`. Unscoped callers are unchanged |
| `bilateral-query-params.ts` | `BILATERAL_SCOPE_QUERY_PARAM = 'scope'`, value space `['bilateral']`, `scope: 'bilateral' \| null` in `BilateralQueryParams`, `'scope'` in `ContractKey`. Unknown value → `null` + reported in `stripped`. Serialized only when non-null; `explicitDefaults` does not emit it |
| `bilateral-result-filter.ts` | **Unchanged.** The scope is applied on the server (`CWS-R-7` "must NOT hide rows") |
| `bilateral-overview.service.ts` | Requests `{ scope: 'bilateral' }`. Same cache key: the service has only one variant |
| `bilateral-overview.aggregate.ts` | `OVERVIEW_CATEGORIES` (the display list) = `replicated_w3`, `new_w3`, `w1w2_tagging`. Wire type `OverviewCategory` keeps 5 values. `rollupByProject` drops `allW1W2`. `buildProjectsCoveredKpi`: covered = `agg.new > 0`. `buildByProjectModel`: `notStartedProjectIds` = projects with no new rows, `coveredCount` aligned. `bars` stays all projects with any scoped row |
| `bilateral-overview.component.ts/.html` | `OVERVIEW_CATEGORY_COPY` keeps 3 labels (proposal §4 copy). Total aria text built from the 3. `deepLinkParams()` adds `scope: 'bilateral'` for Results links only (`CWS-DD-5`). No-project link: `{ project: [], source: 'w3' }`. Projects covered sub-line: "n projects with no new result yet" + "n with only replicated updates (not counted)". Not-started strip title "No new results yet" |
| `bilateral-results-list.component.ts` | A `scope` signal set by `applyUrlParams`. Added to the fetch `combineLatest` (distinct), and the fetch passes `{ scope }` per phase. New chip dimension `'scope'`, label "Scope: Bilateral reporting (Overview)". Removing it clears the signal and writes the URL. `hasActiveFilters` counts it |

### 6.3 Design system usage

No new component. The chip reuses the existing Results-tab chip. The copy goes in the existing constants. Spartan is not needed (no new primitive).

## 7. Security & Authorization

Same guard as today. The new param is a closed enum; any other value is ignored. No logging of params.

## 8. Performance & Capacity

The scoped CIP response is ~63 rows instead of 269. The extra predicate reuses `tagged`, which is already joined. The Results tab makes no additional request; the scope only changes the URL of the existing one.

## 9. Observability

None added. The existing repository error handler covers the query.

## 10. Testing Plan

Jest only, `--maxWorkers=2`, `--findRelatedTests` on the changed files (memory: a folder-scoped run once missed a consumer spec).

| Layer | Assertion | Requirement |
|---|---|---|
| `result.repository.spec.ts` | Scoped call: predicate present + flag parameters bound to 1. Unscoped call: predicate flag bound to 0, and the rest of the SQL and parameters equal to today's. `includeProjectTagging` alone: same as today | `CWS-R-1` |
| `results.controller` / `service` spec (where they exist) | `scope=bilateral` → flag true; `scope=foo` → false | `CWS-R-1` rule |
| `bilateral-query-params.spec.ts` | Parse / serialize / strip `scope` | `CWS-R-7` |
| `bilateral-overview.aggregate.spec.ts` | 63/0/0 Total + 3 lines; tile identity; Projects covered 0 of 57 + 5 only replicated; Not started = N − X; no-project W3-only; bars + no-project + unmatched = Total | `CWS-R-3..6` |
| `bilateral-overview.component.spec.ts` | Total card renders 3 lines and aria; Results links carry `scope`; Reporting / Draft links do not; no-project link `source=w3` | `CWS-R-3`, `-8` |
| `bilateral-overview.service.spec.ts` | Request carries `scope=bilateral` | `CWS-R-2` |
| `bilateral-results-list.component.spec.ts` | Scoped URL → scoped request + chip; chip removal → unscoped refetch; no scope → request unchanged | `CWS-R-7` |
| `bilateral-projects-panel` spec | Runs green unchanged (`P-3`) | `CWS-R-2` |
| HITL on PRTest | CIP + IITA: each Results-linked figure = visible count; visual check of the Total card and the chip | `CWS-AC-9` |

What the fixtures cannot prove: real row shapes (string ids, nulls) and reconciliation with live data (`KZ-EVM-1`). That is the HITL check.

## 11. Backwards Compatibility & Migration Plan

- Additive server param. Clients without it get today's response.
- Deploy order does not matter: an old server ignores `scope`, so the Overview shows today's 5 categories and the client displays 3. For the duration of a split deploy, the Total headline could exceed the sum of the 3 lines. Ship server and client in the same release.
- Rollback: revert the client commit (the Overview returns to `includeProjectTagging`). The server param can stay.

## 12. Design Decisions

### `CWS-DD-1` — Filter in SQL, opt-in param (proposal Option A)

Considered client-only filtering (B) and changing the default (C). B ships ~76% unused rows and still leaves the Results tab without the tagging rows. C silently changes the Results tab and the Centers block. **Chosen: A.**

### `CWS-DD-2` — Predicate mirrors the `CASE`, precedence kept (`CWS-OQ-2`)

A replicated `Result` row stays `replicated_w1w2` even if it tags a center project, so it is excluded. Prod CIP: 0 such rows. `CWS-T-1` counts them for all centers before writing code. If the count is > 0, execution stops at HITL instead of choosing silently.

### `CWS-DD-3` — `replicated_w3` stays "center on the result" (`CWS-OQ-1`)

No project-ownership filter. The 5 rows with no project and the 4 on other centers' projects stay visible on their own lines. If Nicoleta asks for 54, this becomes one extra condition in the predicate, a follow-up change.

### `CWS-DD-4` — `includeProjectTagging` kept; the scope supersedes it (`CWS-OQ-4`)

Keeping the flag costs one bound parameter and avoids breaking an unknown caller. The client stops sending it.

### `CWS-DD-5` — Scope key only on Results links

The Reporting and Draft Results tabs do not read `scope`, and do not need to. Emitting it there would leave a key that has no effect in their URLs and confuse users.

### `CWS-DD-6` — Removing two categories from the Overview *(reversion)*

**Challenge (Step 2.3, run inline): "what does removing this break?"**

1. The Reporting projects panel shares the cache entry (`P-2`). Its per-project counts change only for replicated W1/W2 rows on a center project. That is 0 in CIP; for the other centers it is covered by the `CWS-T-1` pre-check (`P-3`).
2. The no-project line's `allW1W2` / `source=w1w2` branch becomes dead code and is removed.
3. Fixtures and the Cypress CT stub carry 5 categories. They are updated; the CT spec only measures layout.
4. A split deploy would show a Total that does not add up (§11).

There is no other consumer. Accepted.

### `CWS-DD-7` — Replicated rows no longer cover a project *(reversion)*

**Challenge: "what does removing this break?"**

1. The Projects covered link to Reporting never reconciled to X. It opens all projects. Unchanged and recorded in §13.
2. "Not started yet" now includes projects that already have a replicated bar. To avoid a contradiction on screen, the strip is retitled "No new results yet" (`CWS-OQ-3` copy).
3. The projects panel does not use this KPI.

Accepted with the retitle.

## 13. Open Gaps & Follow-ups

- **Copy pending with Nicoleta:** `CWS-OQ-1` (63 vs 54) and `CWS-OQ-3` (the "only replicated" line and the strip title).
- Child #2 rebases: the no-project row is now W3-only, and its exact link is `CNP-R-2`.
- The unused `bilateral-center-overview-totals` endpoint (existing follow-up).
- The Projects covered → Reporting link has never reconciled with X (pre-existing, not in scope).
