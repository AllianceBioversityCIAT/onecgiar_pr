## Context

The shared `aow-hlo-table` component renders three views via `tableType`: `outputs`, `outcomes`, and `2030-outcomes`. After P2-3053, the target column title is dynamic (`{phaseYear} target`) for all three. Product clarified that **2030 Outcomes** is different: it tracks progress toward the **2030 cumulative target**, not the current reporting year.

Backend data for 2030 Outcomes comes from `AoWBilateralRepository.find2030Outcomes`, which calls `buildTocQuery` with category `EOI`. Previously `buildTocQuery` filtered targets with `trit.target_date = reportingYear`, yielding a single-year sum.

## Goals / Non-Goals

**Goals:**
- 2030 Outcomes table shows **"2030 target"** column with cumulative `target_value_sum` (2025–2030).
- Progress percentage for 2030 Outcomes uses cumulative target as denominator.
- All AoW views show **"Achieved value"** instead of "Achieved target".
- HLO and Intermediate Outcomes keep `{phaseYear} target` and single-year `target_value_sum`.

**Non-Goals:**
- Changing contribution/actual-achieved aggregation (still reporting-year scoped).
- Changing target-details drawer year breakdown.
- Hardcoding year range beyond 2025–2030 for 2030 Outcomes.

## Decisions

**Decision 1 — Conditional column title in `columnOrder` computed.**
When `tableType === '2030-outcomes'`, use literal `'2030 target'`; otherwise `${reportingPhaseYear} target`. Rationale: minimal branch in existing computed; no new inputs.

**Decision 2 — `cumulativeTargetYears` option on `buildTocQuery`.**
Add optional `{ from: number; to: number }`. When set, join filter becomes `trit.target_date BETWEEN ? AND ?`; default path keeps `trit.target_date = reportingYear`. Only `find2030Outcomes` passes `{ from: 2025, to: 2030 }`. Rationale: avoids duplicating the large SQL builder; other callers unchanged.

**Decision 3 — Recalculate progress in `find2030Outcomes`.**
After fetching rows with cumulative `target_value_sum`, compute `progress_percentage` via existing `calculateProgressPercentage(cumulativeTarget, actualAchieved)` instead of reusing contribution query's single-year target. Rationale: contributions query still scopes to reporting year for actuals; denominator must match cumulative target.

**Decision 4 — Global "Achieved value" rename.**
Apply in `aow-hlo-table` and `aow-view-results-drawer` column configs. Rationale: product request applies to all AoW table contexts using these components.

## Risks / Trade-offs

- [Year range 2025–2030 hardcoded] → Acceptable per product; extract to constants if range changes later.
- [Progress % differs from HLO view for same indicator] → Expected; 2030 view uses cumulative denominator.
- [Missing target rows for some years] → SUM ignores nulls; behaves like partial cumulative.

## Migration Plan

Deploy server + client together. No DB migration. Rollback = revert both sides. After deploy, verify 2030 Outcomes endpoint returns larger `target_value_sum` than single-year endpoints for the same indicator.

## Open Questions

- None blocking. Year range confirmed with product.
