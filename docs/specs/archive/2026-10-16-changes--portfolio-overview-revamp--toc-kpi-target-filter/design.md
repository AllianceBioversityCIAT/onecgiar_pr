# Design — ToC KPI coverage: target-only filter

## 1. Change

In `getPortfolioTocCoverage` (`onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts`), add one inner join right after the `toc_results_indicators tri` join:

```sql
JOIN (
  SELECT DISTINCT trit.id_indicator AS indicator_id,
         trit.toc_result_indicator_id AS related_node_id
  FROM ${env.DB_TOC}.toc_result_indicator_target trit
  WHERE trit.target_date = ?
    AND CAST(trit.target_value AS DECIMAL(15,2)) > 0
) tgt ON tgt.indicator_id = tri.id
  AND CONVERT(tgt.related_node_id USING utf8mb4) = CONVERT(tri.related_node_id USING utf8mb4)
```

- Because it is an inner join on `tri`, the filter applies to `total` and `covered` at once (TKF-R-2). The `cov` subquery is unchanged.
- `DISTINCT` keeps one row per indicator and node, so the existing `COUNT(DISTINCT tri.id)` is not inflated by several target rows.
- The match columns and `target_date = ?` mirror `buildIndicatorsQuery` (the same file, ~L631-634), which is the query behind the dashboard-lab `target_value_sum`.
- `CAST(... AS DECIMAL(15,2)) > 0` is the SQL form of the client's `Number.isFinite(target) && target > 0`. MySQL casts a non-numeric string to 0 and NULL stays NULL, so neither passes.

### TKF-DD-1 — "At least one row > 0", not "sum > 0"

The #5 amendment states the rule per target row ("at least one target row for the reporting year with value > 0"). The client reads `target_value_sum` (the sum for the year). The two differ only when an indicator has a negative target row, which a KPI target never has. The amendment text is followed.

## 2. Bound parameters (placeholder order)

| # | Placeholder | Value |
|---|---|---|
| 1 | `wp.year = ?` | `context.reportingYear` |
| 2 | `trit.target_date = ?` (new) | `context.reportingYear` |
| 3.. | `r.source IN (…)` | `W1_W2_RESULT_SOURCE_FILTER` |
| … | `r.status_id IN (…)` | `TOC_KPI_COVERAGE_STATUS_IDS` |
| … | `r.version_id = ?` | `context.versionId` |
| last | `tr.phase = ?` | `context.phaseUuid` |

## 3. Docstring

Replace "No year or target filter on indicators" with the target-only rule and cite P2-3974 and this spec.

## 4. Risks

- **Performance.** The derived table is scanned once per call (not correlated). The CONVERT join has the same cost profile as the `cov` join, which measured 850 ms in #5 T-6. Re-measure in the PRTest smoke.
- **Numbers drop.** Totals will fall to KPIs with a target. Expected and intended.
