# Design — ToC KPI block: disclose KPIs with no target

## 1. Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/portfolio-overview-revamp/toc-kpi-no-target-disclosure/` |
| **Depth** | Standard (compact) |
| **Approval Mode** | gated |
| **Date created** | 2026-10-22 |
| **Status** | approved (2026-10-22) |
| **Implements** | [`requirements.md`](./requirements.md) TND-R-1..R-4, TND-NFR-1..4 |

## 2. Executive Summary

The server keeps one query. The target join changes from an inner `JOIN` to a `LEFT JOIN`, and each count gets a condition: `total` and `covered` only count indicators with a target, and `noTarget` counts the rest. The service and DTOs carry `noTarget` the same way they carry `total`. On the client, the interface gets the field, the format helpers add it up, and the template shows one muted line. No new endpoint, file, module or dependency.

## 3. Architecture Overview

```text
toc_results ─┬─ tri (active indicators, in scope)
             ├─ LEFT JOIN tgt (target rows for year, value > 0)   ← was JOIN
             └─ LEFT JOIN cov (covered set, unchanged)
GROUP BY code, category → total | covered | noTarget
      │
service roll-up (outputs / outcomes / program / portfolio) → DTO (+ noTarget)
      │
toc-kpi-block: toViewRows / toSummary / sumRows (+ noTarget) → template lines
```

## 4. Extended Directory Structure (files touched)

| Package | File | Change |
|---|---|---|
| server | `src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts` | SQL, `PortfolioTocCoverageRow`, docstring |
| server | `…/repositories/aow-bilateral.repository.spec.ts` | SQL-text and mapping cases |
| server | `src/api/results-framework-reporting/results-framework-reporting.service.ts` | `addCounts` and the zero seeds carry `noTarget` |
| server | `…/results-framework-reporting.service.spec.ts` | roll-up cases (TND-S-1.4) |
| server | `src/api/results-framework-reporting/dto/portfolio-toc-coverage.dto.ts` | `noTarget` on `TocKpiCountsDto` (so it reaches program, outputs, outcomes and portfolio) |
| client | `src/app/shared/interfaces/portfolio-toc-coverage.interface.ts` | `noTarget` on `CoverageCount` |
| client | `…/portfolio-overview/components/toc-kpi-block/toc-kpi.format.ts` + spec | `noTarget` through `toViewRows`, `toSummary`, `sumRows` |
| client | `…/toc-kpi-block/toc-kpi-block.component.{ts,html}` + spec | disclosure lines, row with only no-target KPIs, empty-state text |
| client | `src/app/internationalization/portfolio-overview.copy.ts` | subtitle + 3 copy functions |

## 5. Data Model

No schema change and no migration. The data is read from `toc_result_indicator_target` exactly as TKF-R-1 already reads it.

## 6. API Design

`GET api/results-framework-reporting/toc-results/portfolio-coverage`: the path, guard, query params and envelope do not change. `TocKpiCountsDto` gains:

| Field | Type | Meaning |
|---|---|---|
| `noTarget` | integer ≥ 0 | Distinct in-scope KPIs with no target for the reporting year. Not part of `total`, so not part of the ratio |

`PortfolioTocCoverageProgramDto` and the `outputs` / `outcomes` / `portfolio` objects all inherit it from `TocKpiCountsDto`. This change only adds a field (TND-S-1.5).

## 7. Backend Module Design

### 7.1 Repository query

- Change `JOIN ( … ) tgt` to `LEFT JOIN ( … ) tgt`. The subquery and its `ON` stay as they are.
- `total` counts `DISTINCT tri.id` only when `tgt.indicator_id IS NOT NULL`.
- `covered` counts `DISTINCT tri.id` only when **both** `tgt.indicator_id IS NOT NULL` and `cov.indicator_id IS NOT NULL`. Under the inner join, the target condition was implied. With the `LEFT JOIN` it has to be written out, or a no-target KPI with a result would be counted as covered (TND-S-1.3).
- `noTarget` counts `DISTINCT tri.id` only when `tgt.indicator_id IS NULL`.
- Bound parameters: same values, same order (`wp.year`, `target_date`, sources, statuses, version, phase). Only the join keyword changes. The number of placeholders does not.
- Row mapping adds `noTarget: Number(row.no_target)`. `debug: false` stays (TND-NFR-3).
- Fan-out check: `tgt` is `DISTINCT` per (indicator, node), and a `tri` row has one `related_node_id`. So each `tri` gets at most one `tgt` row, and `COUNT(DISTINCT …)` stays exact.

### 7.2 Service roll-up

- The zero seeds (`{ total: 0, covered: 0 }` for `outputs`, `outcomes` and `portfolio`) gain `noTarget: 0`.
- `addCounts` adds `noTarget` along with `total` and `covered`.
- Program level: `noTarget = outputs.noTarget + outcomes.noTarget`.
- Programs with no rows (seeded from CLARISA) stay at 0 (TND-S-1.4).

## 8. Frontend / UX Component Architecture

### 8.1 Data helpers (`toc-kpi.format.ts`)

- `TocKpiViewRow` gains `noTarget`. `TocKpiSummary` gets it from `CoverageCount`.
- `toViewRows` and `toSummary` read `noTarget ?? 0` (TND-DD-3).
- `sumRows` also adds up `noTarget`, so the summary under the Program filter covers it (TND-S-2.3, GLF-P-5).

### 8.2 Template (`toc-kpi-block.component.html`)

| Spot | Today | After |
|---|---|---|
| Summary block | label + count/% + bar | adds one line under the bar when `summary().noTarget > 0`: `copy.excludesNoTarget(n)` (`data-testid="toc-kpi-summary-no-target"`) |
| Row, `percent !== null` | name button + split line | adds one line under the split line when `row.noTarget > 0` (`data-testid="toc-kpi-no-target"`) |
| Row, `percent === null` | `copy.noKpis` | `row.noTarget > 0` → `copy.noTargetOnly(n)`, otherwise `copy.noKpis` (TND-S-3.1/3.2) |
| Empty state | `copy.empty` | the visible `noTarget` sum > 0 → `copy.emptyNoTarget(n)`, otherwise `copy.empty` (TND-S-3.3) |

- Style: the same class set as `toc-kpi-split` (`text-[12px]`, `--pr-text-secondary`). No new tokens, colours or components. It is plain text with no role and no interaction (TND-NFR-4). It uses no Spartan primitive, because there is nothing interactive.
- Layout: the line sits in the left column (`min-w-0 flex-col`), so it wraps inside that column and cannot push the figures or the bar (TND-NFR-2). The browser check confirms this at 375 px.
- Component: a computed `visibleNoTarget` (sum over `rows()`) feeds the empty-state text. `isEmpty` itself does not change (see the challenge in §10).

### 8.3 Copy (`PORTFOLIO_OVERVIEW_COPY.tocKpi`)

| Key | Text |
|---|---|
| `subtitle(year)` | `KPIs covered by at least one W1/W2 result in QA or Submitted status, out of the KPIs with a target in each Program's Theory of Change for ${year}` |
| `excludesNoTarget(n)` | `excludes 1 KPI with no target set` / `excludes ${n} KPIs with no target set` |
| `noTargetOnly(n)` | `No KPIs with a target · ${n} with no target set` |
| `emptyNoTarget(n)` | `No ToC KPIs have a target for this phase yet · ${n} with no target set` |

## 9. Shared Contracts

None outside the endpoint DTO and its client interface (§6).

## 10. Design Decisions

| ID | Decision | Why / rejected |
|---|---|---|
| TND-DD-1 | One query with conditional counts (proposal Option A) | One scan, so the scopes cannot drift apart. Rejected: two queries (B), because they scan twice and drift |
| TND-DD-2 | `covered` gets an explicit target condition | Keeps TKF-R-2 true after the join becomes `LEFT`. Without it, `covered` could be greater than `total` |
| TND-DD-3 | The client reads `noTarget ?? 0` | Client and server are released separately. A client running against the old server shows no disclosure instead of `NaN`. Rejected: required field with no fallback |
| TND-DD-4 | The disclosure copy is in this block's copy file, worded like the SP helpers (`dashboard-lab`, `program-overview.component.ts`) but not shared with them | The SP helpers are private methods in another page. Pulling them into a shared util would touch files outside this scope for one string. If the text changes later, record it as a kaizen candidate |
| TND-DD-5 | No `noTarget` in the split line | Proposal TND-OQ-2. The row stays short at 375 px |

### Reversion challenge (Step 2.3)

Question: "What does replacing the inner `JOIN` with a `LEFT JOIN` break?"

1. **`covered` would count KPIs with no target.** DD-2 addresses this, and T-1 tests it.
2. **`isEmpty` and `percent === null` keep their meaning**, because `total` still excludes KPIs with no target. Only the text changes (§8.2).
3. **Performance.** The `LEFT JOIN` keeps more `tri` rows into the `cov` join, so the query does a bit more work. This is checked by TND-NFR-1 at T-3.

Nothing else depends on the inner join. The #6 filters work on the client, on `total` / `covered`.

## 11. Risks, Rollout, Rollback

- **Rollout:** server first, or both at once. DD-3 makes the order safe.
- **Rollback:** revert the commits. There is no data change.
- **Observability:** no new logs. The query text is still never logged (`debug: false`).

## 12. Budget (tripwire for `/akili-execute`)

| Metric | Estimate |
|---|---|
| Tasks | 3 (server, client, verification) |
| LOC | ≈ 260 (≈ 90 production, ≈ 170 tests/specs) |
| Review rounds | ≤ 2 per code task |

The estimate matches the Standard (compact) depth. No change of level.
