# Design — Portfolio Overview: partial-results banner and open-cycle detection

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/portfolio-overview-partial-counts` |
| Depth | Lite |
| Based on | `requirements.md` (REQ-1, REQ-2, REQ-3) |

## 2. Executive Summary

Two surgical changes, no architecture change:

1. **Server:** add a deterministic `ORDER BY` to `AllResultsByRoleUserAndInitiativeFiltered` so open-phase rows (`phase_status = 1`) always sort ahead of closed-phase rows, guaranteeing they survive `LIMIT/OFFSET` regardless of total historical volume.
2. **Client:** stop binding the partial-results banner to the post-filter open-phase row count; bind it to the actual fetched-row count vs. the server's `meta.total`.

Fixing (1) alone also fixes REQ-2 (open-cycle detection) as a side effect, since `apply()`'s fallback-to-closed-phase logic only fires when no open-phase row is visible in the fetched page — which (1) prevents.

## 3. Architecture Overview

No new components, services, modules, or data flows. This is a query-ordering fix inside an existing repository method, plus a data-binding fix inside an existing Angular service/template. The request path (`results.controller.ts:169` → `results.service.ts:1340` → `result.repository.ts:695-871`) is unchanged.

## 4. Extended Directory Structure

No new files.

```
onecgiar-pr-server/src/api/results/
└── result.repository.ts          # MODIFIED: add ORDER BY to AllResultsByRoleUserAndInitiativeFiltered

onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/
├── services/portfolio-overview.service.ts   # MODIFIED: partial-banner counts
└── portfolio-overview.component.html        # MODIFIED: banner copy binding
```

## 5. Data Model

No schema change. Behavior change only: the existing `version.phase_status` column (already selected/joined by the query) becomes part of the `ORDER BY` clause instead of being read only for client-side filtering.

## 6. API Design

No contract change to `GET /api/results/get/all/roles/filter/:userId`. Response shape (`{ response, meta: { total, ... } }`) is unchanged. Only the **row order** within a given page changes; `meta.total` computation (separate `COUNT(1)`) is unchanged, since REQ-1's fix is ordering, not filtering.

## 7. Backend Module Design

**`result.repository.ts` → `AllResultsByRoleUserAndInitiativeFiltered`** (lines ~695-871):

- Add `ORDER BY v.status DESC, r.id DESC` (or the equivalent open-phase-first, then stable-tiebreaker ordering) immediately before the existing `LIMIT ? OFFSET ?` (lines 836-851). `v.status` (the `version` table's open/closed flag, joined as `v` — confirm exact alias/column name against the existing query before editing) ranking open (`1`) ahead of closed values pushes every open-phase row to the front of the unbounded result set, so a `LIMIT` smaller than the full historical count still captures all of them (open-phase row counts are always far smaller than history, per the component's own `CLAUDE.md` sizing assumption).
- `r.id DESC` (or existing PK) as a secondary key only for deterministic tie-breaking within the same `status` — not a functional requirement, just removes "any other row" nondeterminism so repeated calls return consistent pages.
- No change to the WHERE clause, joins, or the separate `meta.total` `COUNT(1)` query (lines 856-860) — REQ-1 is solely about which rows land inside the `LIMIT`, not about total counting.

**Design Decision D-1:** Order by phase status, not by adding a phase filter to the WHERE clause (Option C from the proposal, explicitly deferred). Rationale: this repository method is shared by other callers whose filtering contract must not change; an `ORDER BY` is a strictly additive, order-only change with no risk of altering *which* rows a caller within its own `LIMIT` receives — only reordering them. Trade-off: doesn't reduce the amount of data scanned (still queries all history), only reorders it — acceptable because REQ-1's NFR requires no behavior change for other callers, and a full phase-scoping refactor is explicitly out of scope (proposal §6 Non-Goals, Option C).

## 8. Frontend / UX Component Architecture

**`portfolio-overview.service.ts`:**
- Introduce a distinct value for "rows actually fetched from the server" (e.g. `fetchedCount`, taken from `items.length` / `response.length` at fetch time, before phase-filtering) alongside the existing `meta.total`. Today only `rows().length` (post `apply()` phase-filter) is exposed as `total` (service.ts:186) and reused by the banner; that computed value keeps its existing name/consumers for the "Total Portfolio Results" tile (which legitimately means "open-phase result count" there), but the **banner** must read `fetchedCount` / `meta.total`, not this value.
- `isPartial` logic (today: `meta.total > items.length`, service.ts:474) is unchanged — it already compares the right two things; only what the **banner text displays** needs to change to match.

**`portfolio-overview.component.html`:**
- Line 24's banner interpolation changes from `data.total()` (open-phase-filtered count) to the new fetched-count signal, so "Showing the first N results" is literally true of what was fetched, with "the server holds more" continuing to reference `meta.total`.

**Design Decision D-2:** Keep the existing `total()` computed (open-phase count) exactly as-is for the "Total Portfolio Results" KPI tile — that tile's meaning ("how many results in the open cycle") is correct and unaffected; only the banner sentence, which was quoting the wrong variable for a different claim, changes its binding. No public API of the service is removed, only a new signal is added — no reversion of delivered behavior (Step 2.3 challenge not triggered: nothing here removes/disables/inverts an existing guard, cache, fallback, or blend mode; it corrects a mislabeled binding and adds ordering that only strengthens an existing guard's correctness).

## 9. Shared Contracts Or Package Extensions

None. No shared interface (`shared/interfaces/`) changes — `meta.total` and item shape are unchanged.

## 10. Design Decisions

| ID | Decision | Rationale | Alternative rejected |
|---|---|---|---|
| D-1 | Fix via `ORDER BY` (open-phase-first) rather than pre-filtering by phase in the shared repository method | Additive, zero blast radius on other callers of `AllResultsByRoleUserAndInitiativeFiltered`; smallest change that satisfies REQ-1's NFR (no regression for other callers) | Option C (filter-before-limit) — correct long-term but touches a shared method's filtering contract; deferred as noted in the proposal |
| D-2 | Banner binds to fetched-row count / `meta.total`, KPI tile keeps binding to open-phase-filtered count | The two numbers answer different questions ("what did we fetch" vs. "how many results are in the open cycle") and both are legitimate — the bug was conflating them under one label, not that either number was wrong in isolation | Renaming/removing `total()` — rejected, it's correctly used elsewhere (KPI tile) |

### Budget (Step 2.4)

| Metric | Estimate |
|---|---|
| Expected tasks | 3 (server ordering fix + regression test; client banner fix + regression test; manual prod-vs-test re-verification) |
| Expected LOC | ~40–70 (mostly test code; production change is a few lines in each file) |
| Expected review rounds | 1 |

Depth check: `Lite` matches — this is a two-file production change with two narrowly scoped tests and one manual verification step, well under the threshold where `Standard` would be warranted.

## 11. Design Approval

Present to user: architecture (query ordering + banner rebind, no new components), the two Design Decisions (D-1, D-2), and the budget above.
